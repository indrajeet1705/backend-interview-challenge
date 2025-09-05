import axios from 'axios';
import {
  Task,
  SyncQueueItem,
  SyncResult,
  BatchSyncRequest,
  BatchSyncResponse,
} from '../types';
import { Database } from '../db/database';
import { TaskService } from './taskService';
import { UUID } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
export class SyncService {
  private apiUrl: string;

  constructor(
    private db: Database,
    private taskService: TaskService,
    apiUrl: string = process.env.API_BASE_URL || 'http://localhost:3000/api',
  ) {
    this.apiUrl = apiUrl;
  }

  async sync(): Promise<SyncResult> {
    // TODO: Main sync orchestration method
    // 1. Get all items from sync queue
    // 2. Group items by batch (use SYNC_BATCH_SIZE from env)
    // 3. Process each batch
    // 4. Handle success/failure for each item
    // 5. Update sync status in database
    // 6. Return sync result summary
    try {
      const items = await this.db.all('SELECT * FROM sync_queue WHERE retry_count < ?',[5]);

      if (items.length === 0) {
        return {
          success: true,
          synced_items: 0,
          failed_items: 0,
          errors: [],
        };
      }
      const batches = [];
      const batchSize = parseInt(process.env.SYNC_BATCH_SIZE || '50');
      for (let i = 0; i < items.length; i += batchSize) {
        batches.push(items.slice(i, i + batchSize));
      }
      let synced_items = 0;
      let failed_items = 0;
      const errors = [];
      for (const batch of batches) {
        console.log('in batch');
        const response = await this.processBatch(batch);
        // console.log(response);
        for (let i = 0; i < batch.length; i++) {
          
          console.log('in for loop', response);
          const item = batch[i];
          const result = response.processed_items[i];
          if (result.status == 'success') {
            console.log('one item synced');
            await this.updateSyncStatus(
              item.task_id,
              'synced',
              result.resolved_data,
            );
            synced_items++;
          } else {
            console.log('one item failed');
            await this.handleSyncError(
              item,
              new Error(result.error || 'error'),
            );
            failed_items++;
            errors.push({
              task_id: item.item_id,
              operation: item.operation,
              error: `${result.error}`,
              timestamp: new Date(),
            });
          }
        }
      }
      console.log('before return');
      return {
        success: failed_items === 0,
        synced_items,
        failed_items,
        errors,
      };
    } catch (error) {
      return {
        success: false,
        synced_items: 0,
        failed_items: 0,
        errors: [
          {
            task_id: 'system',
            operation: 'sync',
            error: (error as Error).message,
            timestamp: new Date(),
          },
        ],
      };
    }
  }

  async addToSyncQueue(
    taskId: string,
    operation: 'create' | 'update' | 'delete',
    data: Partial<Task>,
  ): Promise<void> {
    // TODO: Add operation to sync queue
    // 1. Create sync queue item
    // 2. Store serialized task data
    // 3. Insert into sync_queue table
    console.log(' in add to sync queue');
    const id = uuidv4();
    const dataToInsert = {
      title: data.title,
      description: data.description,
    };

    await this.db.run(
      'INSERT INTO sync_queue (id,task_id,operation,data,created_at,retry_count,error_message) VALUES(?,?,?,?,?,?,?)',
      [
        id,
        taskId,
        operation,
        JSON.stringify(dataToInsert),
        data.created_at,
        0,
        'No Error',
      ],
    );
  }

private async processBatch(
  items: SyncQueueItem[],
): Promise<BatchSyncResponse> {
  try {
    const batchRequest: BatchSyncRequest = {
      items,
      client_timestamp: new Date(),
    };

   console.log('in processBatch', batchRequest);

    const response = await axios.post(
      `${this.apiUrl}/sync/batch`,
      batchRequest,
      { timeout: 30000 ,
        headers: {
      'Content-Type': 'application/json',
    },
      },
      
        
      
    );

    

    const batchResponse: BatchSyncResponse = response.data;
    return batchResponse;
  } catch (error) {
    console.log('in catch of processBatch')
    console.error("Error in processBatch:", error);
    throw error;
  }
}


  private async resolveConflict(
    localTask: Task,
    serverTask: Task,
  ): Promise<Task> {
    // TODO: Implement last-write-wins conflict resolution
    // 1. Compare updated_at timestamps
    // 2. Return the more recent version
    // 3. Log conflict resolution decision
    const ComparedTimeStampTask =
      localTask.updated_at > serverTask.updated_at ? localTask : serverTask;
    return ComparedTimeStampTask;
  }

  private async updateSyncStatus(
    taskId: string,
    status: 'synced' | 'error',
    serverData?: Partial<Task>,
  ): Promise<void> {
    // TODO: Update task sync status

    try {
      const now = new Date();
      const task = await this.db.get('SELECT * FROM tasks WHERE id = ?', [
        taskId,
      ]);
      if (!task) {
        throw new Error('Task not found');
      }
      await this.db.run(
        'UPDATE tasks SET sync_status = ?, last_synced_at = ?, server_id = ? WHERE id = ?',
        [status, now, serverData?.server_id || task.server_id],
      );
      if (status === 'synced') {
        await this.db.run('DELETE FROM sync_queue WHERE task_id = ?', [taskId]);
      }
    } catch (error) {
      throw new Error(
        `Failed to update sync status: ${(error as Error).message}`,
      );
    }
  }

  private async handleSyncError(
    item: SyncQueueItem,
    error: Error,
  ): Promise<void> {
    // TODO: Handle sync errors

    try {
      const maxRetries = parseInt(process.env.MAX_RETRY_COUNT || '5');
      const newRetryCount = item.retry_count + 1;
      if (newRetryCount >= maxRetries) {
        await this.db.run(
          'UPDATE sync_queue SET retry_count = ?, error_message = ? WHERE id = ?',
          [newRetryCount, `Permanent failure: ${error.message}`, item.id],
        );
      } else {
        await this.db.run(
          'UPDATE sync_queue SET retry_count = ?, error_message = ? WHERE id = ?',
          [newRetryCount, error.message, item.id],
        );
      }
    } catch (dbError) {
      console.error(
        `Failed to handle sync error: ${(dbError as Error).message}`,
      );
    }
  }

  async checkConnectivity(): Promise<boolean> {
    // TODO: Check if server is reachable
    // 1. Make a simple health check request
    // 2. Return true if successful, false otherwise
    try {
      await axios.get(`${this.apiUrl}/health`, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}
