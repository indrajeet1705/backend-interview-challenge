import { Router, Request, Response } from 'express';
import { SyncService } from '../services/syncService';
import { TaskService } from '../services/taskService';
import { Database } from '../db/database';
import { v4 as uuid4 } from 'uuid';

export function createSyncRouter(db: Database): Router {
  const router = Router();
  const taskService = new TaskService(db);
  const syncService = new SyncService(db, taskService);

  // Trigger manual sync
  router.post('/sync', async (req: Request, res: Response) => {
    // TODO: Implement sync endpoint
    // 1. Check connectivity first
    // 2. Call syncService.sync()
    // 3. Return sync result
  try {
      if (!(await syncService.checkConnectivity())) {
        return res.status(503).json({ error: 'Server not reachable' });
      }
      const result = await syncService.sync();
      return res.json(result);
    } catch (error) {
      return res.status(500).json({ error: 'Sync failed' });
    }
  });

  // Check sync status
  router.get('/status', async (req: Request, res: Response) => {
    // TODO: Implement sync status endpoint
    // 1. Get pending sync count
    // 2. Get last sync timestamp
    // 3. Check connectivity
    // 4. Return status summary
    try {
      const pendingCount = await db.get(
        'SELECT COUNT(*) as count FROM sync_queue WHERE retry_count < ?',
        [5],
      );
      const lastSync = await db.get(
        'SELECT MAX(last_synced_at) as last_sync FROM tasks WHERE sync_status = ?',
        ['synced'],
      );
      const isConnected = await syncService.checkConnectivity();
      return res.json({
        pending_items: pendingCount.count || 0,
        last_sync: lastSync.last_sync || null
        ,
        server_reachable: isConnected,
      });
    } catch (error) {
      throw new Error('Method not implemented.');
    }
  });

  // Batch sync endpoint (for server-side)
  router.post('/sync/batch', async (req: Request, res: Response) => {
    // TODO: Implement batch sync endpoint
    // This would be implemented on the server side
    // to handle batch sync requests from clients
    
    try {
      const {items,client_timestamp}=req.body
      if(!items || !client_timestamp){
        return res.status(400).json({error:'Invalid request'})
      }
      let processed_items=[]
     for (let item of  items){
            processed_items.push({
              client_id:item.id,
              server_id:uuid4(),
              status:'success',
            })
     }
     return res.status(200).json({processed_items})
    
    } catch (error) {
      throw new Error('Method not implemented.');
    }
  });

  // Health check endpoint
  router.get('/health', async (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date() });
  });

  return router;
}