import { Router, Request, Response } from 'express';
import { SyncService } from '../services/syncService';
import { TaskService } from '../services/taskService';
import { Database } from '../db/database';

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
      const  isConnected = syncService.checkConnectivity()
      if( !isConnected){
        return res.status(500).json({
          success:false,
        error:"Server is not Reachable"
        })
      }
       const response= await syncService.sync()
       return response


   } catch (error) {
    
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
      
    } catch (error) {
      
    }
  });

  // Batch sync endpoint (for server-side)
  router.post('/batch', async (req: Request, res: Response) => {
    // TODO: Implement batch sync endpoint
    // This would be implemented on the server side
    // to handle batch sync requests from clients
    res.status(501).json({ error: 'Not implemented' });
  });

  // Health check endpoint
  router.get('/health', async (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date() });
  });

  return router;
}