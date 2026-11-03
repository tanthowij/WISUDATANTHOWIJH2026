/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ClientProject, Photo, PhotoComment, StoryCollagePage, User, WorkflowStatus } from '../types';
import { INITIAL_CLIENTS } from './mockData';

const CLIENTS_STORAGE_KEY = 'wisuda_tanthowi_clients_v3';
const USER_STORAGE_KEY = 'wisuda_tanthowi_active_user_v3';

export class AppStorage {
  private static clientsCache: ClientProject[] | null = null;

  public static getClients(): ClientProject[] {
    if (this.clientsCache) {
      return this.clientsCache;
    }

    try {
      const stored = localStorage.getItem(CLIENTS_STORAGE_KEY);
      if (stored) {
        this.clientsCache = JSON.parse(stored);
        return this.clientsCache!;
      }
    } catch (e) {
      console.error('Failed to read from localStorage', e);
    }

    // Default initialization
    this.clientsCache = INITIAL_CLIENTS;
    this.saveClients(INITIAL_CLIENTS);
    return this.clientsCache;
  }

  public static saveClients(clients: ClientProject[]): void {
    this.clientsCache = clients;
    try {
      localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients));
    } catch (e) {
      console.warn('LocalStorage save failed, using memory cache', e);
    }
  }

  public static getClientById(id: string): ClientProject | undefined {
    return this.getClients().find(c => c.id === id);
  }

  public static getClientByUsername(username: string): ClientProject | undefined {
    return this.getClients().find(c => c.username.toLowerCase() === username.toLowerCase());
  }

  public static updateClient(updatedClient: ClientProject): void {
    const clients = this.getClients();
    const index = clients.findIndex(c => c.id === updatedClient.id);
    if (index >= 0) {
      clients[index] = updatedClient;
    } else {
      clients.push(updatedClient);
    }
    this.saveClients([...clients]);
  }

  public static addClient(newClient: ClientProject): void {
    const clients = this.getClients();
    this.saveClients([newClient, ...clients]);
  }

  public static deleteClient(clientId: string): void {
    const clients = this.getClients().filter(c => c.id !== clientId);
    this.saveClients(clients);
  }

  public static getCurrentUser(): User | null {
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to read user session', e);
    }
    // Default logged in as Annisa (Client) for instant preview, with quick switch to Admin in header!
    return {
      id: 'usr_client_001',
      username: 'klien_annisa',
      name: 'Annisa Rahmawati, S.Ked',
      role: 'client',
      phone: '6281234567890',
      email: 'annisa.kedokteran@ui.ac.id',
      clientId: 'client_001',
    };
  }

  public static setCurrentUser(user: User | null): void {
    try {
      if (user) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to save user session', e);
    }
  }

  /**
   * Toggle photo selection for a client with maximum limit check (default 25)
   */
  public static togglePhotoSelection(
    clientId: string,
    photoId: string
  ): { success: boolean; isSelected: boolean; currentCount: number; maxCount: number; message?: string } {
    const client = this.getClientById(clientId);
    if (!client) {
      return { success: false, isSelected: false, currentCount: 0, maxCount: 25, message: 'Klien tidak ditemukan' };
    }

    const photo = client.photos.find(p => p.id === photoId);
    if (!photo) {
      return { success: false, isSelected: false, currentCount: 0, maxCount: client.quotaMaxSelected, message: 'Foto tidak ditemukan' };
    }

    const currentSelectedCount = client.photos.filter(p => p.selected).length;
    const isCurrentlySelected = !!photo.selected;

    if (!isCurrentlySelected && currentSelectedCount >= client.quotaMaxSelected) {
      return {
        success: false,
        isSelected: false,
        currentCount: currentSelectedCount,
        maxCount: client.quotaMaxSelected,
        message: `Batas maksimal pilihan foto tercapai (${client.quotaMaxSelected} foto). Batalkan pilihan foto lain terlebih dahulu untuk memilih foto ini.`,
      };
    }

    photo.selected = !isCurrentlySelected;
    photo.stage = photo.selected ? 'SELECTED' : 'RAW';

    const newSelectedCount = client.photos.filter(p => p.selected).length;
    this.updateClient(client);

    return {
      success: true,
      isSelected: photo.selected,
      currentCount: newSelectedCount,
      maxCount: client.quotaMaxSelected,
    };
  }

  /**
   * Submit client photo selection to admin
   */
  public static submitSelection(
    clientId: string,
    notes?: string
  ): { success: boolean; selectedCount: number } {
    const client = this.getClientById(clientId);
    if (!client) return { success: false, selectedCount: 0 };

    const selectedCount = client.photos.filter(p => p.selected).length;
    if (selectedCount === 0) {
      return { success: false, selectedCount: 0 };
    }

    client.currentStatus = 'SELECTION_SUBMITTED';
    client.selectionSubmittedAt = new Date().toISOString();
    if (notes) client.clientNotes = notes;

    client.activityLog.unshift({
      id: `act_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: client.name,
      action: `Klien mengirimkan pilihan ${selectedCount} foto untuk proses editing`,
      detail: notes,
    });

    this.updateClient(client);
    return { success: true, selectedCount };
  }

  /**
   * Add comment / feedback to a photo
   */
  public static addPhotoComment(clientId: string, photoId: string, comment: Omit<PhotoComment, 'id' | 'createdAt'>): void {
    const client = this.getClientById(clientId);
    if (!client) return;

    const photo = client.photos.find(p => p.id === photoId);
    if (!photo) return;

    if (!photo.feedback) photo.feedback = [];

    const newComment: PhotoComment = {
      ...comment,
      id: `comment_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    photo.feedback.push(newComment);
    if (comment.statusType !== 'COMMENT') {
      photo.approvalStatus = comment.statusType;
    }

    // Update status if client requested revision or approved
    if (comment.statusType === 'REQUEST_REVISION') {
      client.currentStatus = 'REVISION_REQUESTED';
    }

    client.activityLog.unshift({
      id: `act_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: comment.authorName,
      action: `Feedback pada foto #${photo.sequenceNumber} (${comment.statusType}): "${comment.content.slice(0, 40)}..."`,
    });

    this.updateClient(client);
  }

  /**
   * Update workflow status
   */
  public static updateWorkflowStatus(clientId: string, newStatus: WorkflowStatus, actorName: string, detail?: string): void {
    const client = this.getClientById(clientId);
    if (!client) return;

    client.currentStatus = newStatus;
    client.activityLog.unshift({
      id: `act_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: actorName,
      action: `Status pekerjaan diperbarui menjadi: ${newStatus.replace(/_/g, ' ')}`,
      detail,
    });

    this.updateClient(client);
  }

  /**
   * Reset data to initial seed
   */
  public static resetToDefault(): void {
    this.clientsCache = INITIAL_CLIENTS;
    this.saveClients(INITIAL_CLIENTS);
  }
}
