import { v4 as uuidv4 } from 'uuid';
import { Task } from '../types';
import { Database } from '../db/database';
import { UUID } from 'crypto';
import { request } from 'http';
import { fstat } from 'fs';

export class TaskService {
  constructor(private db: Database) {}
  

  async createTask(taskData: Partial<Task>): Promise<Task> {
    // TODO: Implement task creation
    // 1. Generate UUID for the task
    // 2. Set default values (completed: false, is_deleted: false)
    // 3. Set sync_status to 'pending'
    // 4. Insert into database
    // 5. Add to sync queue
    try {
      const id: string = uuidv4();
      const serverId: string = uuidv4();
      const createdAt = new Date();
      const updatedAt = createdAt;

      const query = `
        INSERT INTO tasks 
        (id, title, description, completed, created_at, updated_at, is_deleted, sync_status, server_id, last_synced_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await this.db.run(query, [
        id,
        taskData.title,
        taskData.description || null,
        false, // completed = false
        createdAt,
        updatedAt,
        false, // is_deleted = false
        'pending',
        serverId,
        createdAt,
      ]);
      await this.db.run(`INSERT INTO sync_queue(id,task_id,operation,data,created_at,retry_count,error_message) VALUES (?,?,?,?,?,?,?)`,[
        uuidv4(),
        id,
        'create',
        JSON.stringify({title:taskData.title,description:taskData.description}),
        createdAt,
        0,
        ''
        
      ])
      // Return the created task
      return {
        id,
        title: taskData.title!,
        description: taskData.description,
        completed: false,
        created_at: createdAt,
        updated_at: updatedAt,
        is_deleted: false,
        sync_status: 'pending',
        server_id: serverId,
        last_synced_at: createdAt,
      };
    } catch (error) {
      throw new Error('Error creating task: ' + (error as Error).message);
    }
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    // TODO: Implement task update
    // 1. Check if task exists
    // 2. Update task in database
    // 3. Update updated_at timestamp
    // 4. Set sync_status to 'pending'
    // 5. Add to sync queue
    try {
      const task = await this.db.get('SELECT * FROM tasks WHERE id = ?', [id]);
      if (!task) {
        return null;
      }

      await this.db.run(
        `UPDATE tasks SET title=?,
        description=?,completed=?,updated_at=? WHERE id =?`,
        [updates.title, updates.description, updates.completed, new Date(), id],
      );
       await this.db.run(`INSERT INTO sync_queue(id,task_id,operation,data,created_at,retry_count,error_message) VALUES (?,?,?,?,?,?,?)`,[
        uuidv4(),
        id,
        'update',
        JSON.stringify({title:task.title,description:task.description}),
        new Date(),
        0,
        ''
        
      ])
      return {
        ...task,
        title: updates.title ?? task.title,
        description: updates.description ?? task.description,
        completed: updates.completed ?? task.completed,
        updated_at: new Date(),
        sync_status: 'pending',
      };
    } catch (error) {
      throw new Error('Something went wrong');
    }
  }

  async deleteTask(id: string): Promise<boolean> {
    // TODO: Implement soft delete
    // 1. Check if task exists
    // 2. Set is_deleted to true
    // 3. Update updated_at timestamp
    // 4. Set sync_status to 'pending'
    // 5. Add to sync queue
    try {
      console.log('in function ', id);
      const task = await this.db.get('SELECT * FROM tasks WHERE id =?', [id]);
      if (!task) return false 
        await this.db.run(
          'UPDATE tasks SET is_deleted = ?,updated_at=?, sync_status=? WHERE id = ?',
          [true, new Date(), 'pending', id],
        );
       await this.db.run(`INSERT INTO sync_queue(id,task_id,operation,data,created_at,retry_count,error_message) VALUES (?,?,?,?,?,?,?)`,[
        uuidv4(),
        id,
        'create',
        JSON.stringify({title:task.title,description:task.description}),
        new Date(),
        0,
        ''
        
      ])
        return true;
      
    
        
    } catch (error) {
      throw new Error('Something went wrong');
    }
  }

  async getTask(id: string): Promise<Task | null> {
    // TODO: Implement get single task
    // 1. Query database for task by id
    // 2. Return null if not found or is_deleted is true
    const query: string = 'SELECT * FROM tasks WHERE id=?';
    const singleTask = await this.db.get(query, [id]);
    if (singleTask && !singleTask.is_deleted) {
      return singleTask;
    }
    return null;
  }

  async getAllTasks(): Promise<Task[]> {
    // TODO: Implement get all non-deleted tasks
    // 1. Query database for all tasks where is_deleted = false
    // 2. Return array of tasks
    try {
      const query: string = 'SELECT * FROM tasks';
      const tasks = await this.db.all(query, []);
      return tasks;
    } catch (error) {
      throw new Error('Something went wrong');
    }
  }

  async getTasksNeedingSync(): Promise<Task[]> {
    // TODO: Get all tasks with sync_status = 'pending' or 'error'
    try {
      const tasks = await this.db.all(`SELECT * FROM tasks WHERE sync_status IN ('pending','error') `)
      return tasks
    } catch (error) {
      
      throw new Error('Something went wrong');
    }
  }
}
