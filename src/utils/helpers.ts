import crypto from 'crypto';
import { VideoMetadata } from '../types';

/**
 * Generate a unique ID
 * @returns {string}
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms 
 * @returns {Promise<void>}
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format date to ISO string without milliseconds
 * @param {Date} date 
 * @returns {string}
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('.')[0] + 'Z';
}

/**
 * Convert metadata array to object
 * @param {VideoMetadata[]} metadataArray 
 * @returns {Record<string, any>}
 */
export function metadataToObject(metadataArray: VideoMetadata[]): Record<string, any> {
  const obj: Record<string, any> = {};
  metadataArray.forEach(item => {
    obj[item.key] = convertValueType(item.value, item.type);
  });
  return obj;
}

/**
 * Convert value based on type
 * @param {string} value 
 * @param {string} type 
 * @returns {any}
 */
function convertValueType(value: string, type: string): any {
  switch (type) {
    case 'number':
      return Number(value);
    case 'boolean':
      return value === 'true';
    case 'date':
      return new Date(value);
    default:
      return value;
  }
}

/**
 * Infer value type for metadata
 * @param {any} value 
 * @returns {string}
 */
export function inferValueType(value: any): string {
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (value instanceof Date) return 'date';
  return 'string';
}