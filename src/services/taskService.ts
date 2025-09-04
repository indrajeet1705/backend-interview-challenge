import { v4 as uuidv4 } from 'uuid';
import { Task } from '../types';
import { Database } from '../db/database';
import { UUID } from 'crypto';
import { request } from 'http';
import { fstat } from 'fs';
import { SyncService } from './syncService';

export class TaskService {
  private syncService: SyncService;
  constructor(private db: Database) {
    this.syncService = new SyncService(db, this);
  }

  async createTask(taskData: Partial<Task>): Promise<Task> {
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
      
//Inserted into tasks 
      await this.db.run(query, [
        id,
        taskData.title,
        taskData.description || null,
        false,
        createdAt,
        updatedAt,
        false,
        'pending',
        serverId,
        createdAt,
      ]);
//Inserted into sync_queue
      await this.syncService.addToSyncQueue(id, 'create', taskData);

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
    try {
      const task = await this.db.get('SELECT * FROM tasks WHERE id = ?', [id]);
      if (!task) {
        return null;
      }
//Inserted into tasks 

      await this.db.run(
        `UPDATE tasks SET title=?,
        description=?,completed=?,updated_at=? WHERE id =?`,
        [updates.title, updates.description, updates.completed, new Date(), id],
      );
//Inserted into sync_queue
      await this.syncService.addToSyncQueue(id, 'create', task);
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
    try {
      console.log('in function ', id);
      const task = await this.db.get('SELECT * FROM tasks WHERE id =?', [id]);
      if (!task) return false;
//Inserted into tasks 

      await this.db.run(
        'UPDATE tasks SET is_deleted = ?,updated_at=?, sync_status=? WHERE id = ?',
        [true, new Date(), 'pending', id],
      );
//Inserted into sync_queue
      await this.syncService.addToSyncQueue(id, 'create', task);

      return true;
    } catch (error) {
      throw new Error('Something went wrong');
    }
  }

  async getTask(id: string): Promise<Task | null> {
    const query: string = 'SELECT * FROM tasks WHERE id=?';
    const singleTask = await this.db.get(query, [id]);
    if (singleTask && !singleTask.is_deleted) {
      return singleTask;
    }
    return null;
  }

  async getAllTasks(): Promise<Task[]> {
    try {
      const query: string = 'SELECT * FROM tasks';
      const tasks = await this.db.all(query, []);
      return tasks;
    } catch (error) {
      throw new Error('Something went wrong');
    }
  }

  async getTasksNeedingSync(): Promise<Task[]> {
    try {
      const tasks = await this.db.all(
        `SELECT * FROM tasks WHERE sync_status IN ('pending','error') `,
      );
      return tasks;
    } catch (error) {
      throw new Error('Something went wrong');
    }
  }
}
