export const logger = {
    info: (message: string, meta?: any) => {
        console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta || '');
    },

    error: (message: string, error?: any) => {
        console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
        if (error) {
            console.error('Error details:', {
                message: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
                code: error.code,
            });
        }
    },

    warn: (message: string, meta?: any) => {
        console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta || '');
    },

    debug: (message: string, meta?: any) => {
        if (process.env.NODE_ENV === 'development') {
            console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, meta || '');
        }
    },
};