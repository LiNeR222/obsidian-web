import { openDB, type DBSchema } from 'idb'
import type { FileNode } from '../store/useFileStore'

// Явно описываем схему базы данных
interface ObsidianDB extends DBSchema {
  files: {
    key: string
    value: {
      id: string
      data: FileNode[]
      version: number
      updatedAt: number
    }
    indexes: {
      'updatedAt': number
    }
  }
  content: {
    key: string
    value: {
      path: string
      content: string
      updatedAt: number
    }
    indexes: {
      'updatedAt': number
    }
  }
  settings: {
    key: string
    value: {
      id: string
      value: any
    }
    indexes?: never
  }
}

const DB_NAME = 'obsidian-web'
const DB_VERSION = 1

export async function initDB() {
  return openDB<ObsidianDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion) {
      console.log(`Upgrading DB from version ${oldVersion} to ${newVersion}`)
      
      // Хранилище для дерева файлов
      if (!db.objectStoreNames.contains('files')) {
        const filesStore = db.createObjectStore('files', { keyPath: 'id' })
        filesStore.createIndex('updatedAt', 'updatedAt')
        console.log('Created files store')
      }
      
      // Хранилище для содержимого файлов
      if (!db.objectStoreNames.contains('content')) {
        const contentStore = db.createObjectStore('content', { keyPath: 'path' })
        contentStore.createIndex('updatedAt', 'updatedAt')
        console.log('Created content store')
      }
      
      // Хранилище для настроек
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' })
        console.log('Created settings store')
      }
    }
  })
}

// Сохранение всего дерева файлов
export async function saveFileTree(files: FileNode[]) {
  const db = await initDB()
  await db.put('files', {
    id: 'root',
    data: files,
    version: 1,
    updatedAt: Date.now()
  })
}

// Загрузка дерева файлов
export async function loadFileTree(): Promise<FileNode[] | null> {
  const db = await initDB()
  const result = await db.get('files', 'root')
  return result?.data || null
}

// Сохранение содержимого файла
export async function saveFileContent(path: string, content: string) {
  const db = await initDB()
  await db.put('content', {
    path,
    content,
    updatedAt: Date.now()
  })
}

// Загрузка содержимого файла
export async function loadFileContent(path: string): Promise<string | null> {
  const db = await initDB()
  const result = await db.get('content', path)
  return result?.content || null
}

// Удаление содержимого файла
export async function deleteFileContent(path: string) {
  const db = await initDB()
  await db.delete('content', path)
}

// Сохранение настройки
export async function saveSetting(key: string, value: any) {
  const db = await initDB()
  await db.put('settings', { id: key, value })
}

// Загрузка настройки
export async function loadSetting(key: string): Promise<any | null> {
  const db = await initDB()
  const result = await db.get('settings', key)
  return result?.value || null
}

// Очистка всей базы (для отладки)
export async function clearDatabase() {
  const db = await initDB()
  await db.clear('files')
  await db.clear('content')
  await db.clear('settings')
}

// Удаление всей базы данных
export async function deleteDatabase() {
  const db = await initDB()
  db.close()
  await indexedDB.deleteDatabase(DB_NAME)
}