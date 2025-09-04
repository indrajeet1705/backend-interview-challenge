import { Router, Request, Response } from 'express';
import { TaskService } from '../services/taskService';
import { SyncService } from '../services/syncService';
import { Database } from '../db/database';
import { request } from 'http';
import { Interface } from 'readline';

export function createTaskRouter(db: Database): Router {
  const router = Router();
  const taskService = new TaskService(db);
  const syncService = new SyncService(db, taskService);

  // Get all tasks
  router.get('/', async (req: Request, res: Response) => {
    try {
      const tasks = await taskService.getAllTasks();
      
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  });

  // Get single task
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const task = await taskService.getTask(req.params.id);
      if (!task) {
        res.status(404).json({ error: 'Task not found' });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch task' });
    }
  });

  // Create task
 
  router.post('/', async (req: Request, res: Response) => {
    
    try {
      const { title,description}=req.body;
      console.log(title,description)
      if( !title ){
        res.status(400).json('Enter all fields')
      }
      const newTask= await taskService.createTask({title,description})
      console.log( newTask)
      res.status(200).json({success:true,message:newTask})
    } catch (error) {
      res.status(400).json({success:false,message:'something went wrong'})
    }
  });

  // Update task
  router.put('/:id', async (req: Request, res: Response) => {

try {
    const { title, description, completed } = req.body;

    if (title === undefined || description === undefined || completed === undefined) {
       res.status(400).json({ message: "Missing fields" });
    }

    const updatedTask = await taskService.updateTask(req.params.id, { title, description, completed });

    if (!updatedTask) {
       res.status(404).json({ message: "Task not found" });
    }

    res.status(200).json({ success: true, task: updatedTask });
  } catch (error) {
     res.status(500).json({ message: 'Something went wrong' });
  }
  });

  // Delete task
  router.delete('/:id', async (req: Request, res: Response) => {

    try {
      
      const deletedTask = await taskService.deleteTask(req.params.id)
      
      if(deletedTask){
         res.status(204).json({message:"No Content"})
      }
      else{
         res.status(404).json({message:'Not Found'})
      }
    } catch (error) {
      res.status(500).json({message:"Internal server error"})
      
    }

   
  });

  return router;
}