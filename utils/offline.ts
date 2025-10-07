import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OFFLINE_QUEUE_KEY = 'offline_queue';

interface QueuedRequest {
    id: string;
    url: string;
    options: RequestInit;
    timestamp: number;
}

export class OfflineQueue {
    private static instance: OfflineQueue;
    private queue: QueuedRequest[] = [];

    private constructor() {
        this.loadQueue();
        this.setupNetworkListener();
    }

    static getInstance(): OfflineQueue {
        if (!OfflineQueue.instance) {
            OfflineQueue.instance = new OfflineQueue();
        }
        return OfflineQueue.instance;
    }

    private async loadQueue() {
        try {
            const stored = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
            if (stored) {
                this.queue = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Failed to load offline queue:', error);
        }
    }

    private async saveQueue() {
        try {
            await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(this.queue));
        } catch (error) {
            console.error('Failed to save offline queue:', error);
        }
    }

    private setupNetworkListener() {
        NetInfo.addEventListener(state => {
            if (state.isConnected && this.queue.length > 0) {
                this.processQueue();
            }
        });
    }

    async add(url: string, options: RequestInit) {
        const request: QueuedRequest = {
            id: `${Date.now()}_${Math.random()}`,
            url,
            options,
            timestamp: Date.now(),
        };

        this.queue.push(request);
        await this.saveQueue();
    }

    private async processQueue() {
        console.log(`Processing ${this.queue.length} queued requests...`);

        const processed: string[] = [];

        for (const request of this.queue) {
            try {
                await fetch(request.url, request.options);
                processed.push(request.id);
            } catch (error) {
                console.error('Failed to process queued request:', error);
            }
        }

        this.queue = this.queue.filter(r => !processed.includes(r.id));
        await this.saveQueue();
    }
}