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
      const items = await this.db.all('SELECT * FROM sync_queue');
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
        const response = await this.processBatch(batch);
        for (let i = 0; i < batch.length; i++) {
          const item = batch[i];
          const result = response.processed_items[i];
          if (result.status == 'success') {
            await this.updateSyncStatus(
              item.task_id,
              'synced',
              result.resolved_data,
            );
            synced_items++;
          } else {
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
   try {
      // 1. Create sync queue item
      const queueItem: Partial<SyncQueueItem> = {
        id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        task_id: taskId,
        operation,
        // 2. Store serialized task data
        data: data,
        created_at: new Date(),
        retry_count: 0
      };

      // 3. Insert into sync_queue table
      await this.db.run(
        'INSERT INTO sync_queue (id, task_id, operation, data, created_at, retry_count) VALUES (?, ?, ?, ?, ?, ?)',
        [queueItem.id, queueItem.task_id, queueItem.operation, queueItem.data, queueItem.created_at, queueItem.retry_count]
      );
    } catch (error) {
      throw new Error(`Failed to add to sync queue: ${(error as Error).message}`);
    }
  }

  private async processBatch(
    items: SyncQueueItem[],
  ): Promise<BatchSyncResponse> {
    // TODO: Process a batch of sync items
    // 1. Prepare batch request
    // 2. Send to server
    // 3. Handle response
    // 4. Apply conflict resolution if needed
    try {
      const batchRequest: BatchSyncRequest = {
        items: items,
        client_timestamp: new Date(),
      };

      const response = await axios.post(
        `${this.apiUrl}/sync/batch`,
        batchRequest,
        {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
      const batchrResponse: BatchSyncResponse = response.data;
      console.log(batchrResponse);

      return batchrResponse;
    } catch (error) {
      throw new Error('Not implemented');
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
    try {
      // 1. Compare updated_at timestamps
      const localUpdated = new Date(localTask.updated_at).getTime();
      const serverUpdated = new Date(serverTask.updated_at).getTime();

      // 2. Return the more recent version
      const winner = serverUpdated > localUpdated ? serverTask : localTask;
      
      // 3. Log conflict resolution decision
      console.log(`Conflict resolved for task ${localTask.id}: ${winner === serverTask ? 'server' : 'local'} version chosen`);
      console.log(`Local updated: ${localTask.updated_at}, Server updated: ${serverTask.updated_at}`);

      return winner;
    } catch (error) {
      // Default to server version on error
      console.error(`Error resolving conflict, defaulting to server version: ${(error as Error).message}`);
      return serverTask;
    }
  }

  private async updateSyncStatus(
    taskId: string,
    status: 'synced' | 'error',
    serverData?: Partial<Task>,
  ): Promise<void> {
    // TODO: Update task sync status
    // 1. Update sync_status field
    // 2. Update server_id if provided
    // 3. Update last_synced_at timestamp
    // 4. Remove from sync queue if successful

    try {
      const now = new Date().toISOString();
      
      // 1. Update sync_status field
      // 2. Update server_id if provided
      // 3. Update last_synced_at timestamp
      let updateQuery = 'UPDATE tasks SET sync_status = ?, last_synced_at = ?';
      const params: any[] = [status, now];

      if (serverData?.server_id) {
        updateQuery += ', server_id = ?';
        params.push(serverData.server_id);
      }

      updateQuery += ' WHERE id = ?';
      params.push(taskId);

      await this.db.run(updateQuery, params);

      // 4. Remove from sync queue if successful
      if (status === 'synced') {
        await this.db.run('DELETE FROM sync_queue WHERE task_id = ?', [taskId]);
      }
    } catch (error) {
      throw new Error(`Failed to update sync status: ${(error as Error).message}`);
    }
  }

  private async handleSyncError(
    item: SyncQueueItem,
    error: Error,
  ): Promise<void> {
    // TODO: Handle sync errors
    // 1. Increment retry count
    // 2. Store error message
    // 3. If retry count exceeds limit, mark as permanent failure
     try {
      const maxRetries = parseInt(process.env.MAX_SYNC_RETRIES || '3');
      
      // 1. Increment retry count
      const newRetryCount = (item.retry_count || 0) + 1;
      
      // 2. Store error message
      const errorMessage = error.message;

      // 3. If retry count exceeds limit, mark as permanent failure
      if (newRetryCount >= maxRetries) {
        await this.db.run(
          'UPDATE tasks SET sync_status = ? WHERE id = ?',
          ['error', item.task_id]
        );
        await this.db.run(
          'DELETE FROM sync_queue WHERE id = ?',
          [item.id]
        );
      } else {
        // Update retry count and error message in sync queue
        await this.db.run(
          'UPDATE sync_queue SET retry_count = ?, error_message = ? WHERE id = ?',
          [newRetryCount, errorMessage, item.id]
        );
      }
    } catch (dbError) {
      console.error(`Failed to handle sync error: ${(dbError as Error).message}`);
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
