import { useState, useEffect } from 'react';
import { Accelerometer } from 'expo-sensors';

// --- Configuration ---
const SHAKE_THRESHOLD = 1.8; // How sensitive the shake detection is. Higher is less sensitive.
const SHAKE_TIMEOUT = 1000; // Time in ms to wait after a shake before detecting another one.

export const useShakeDetection = (onShake) =>
{
    const [lastShakeTime, setLastShakeTime] = useState(0);

    useEffect(() =>
    {
        let subscription = null;

        const startListening = () =>
        {
            subscription = Accelerometer.addListener(accelerometerData =>
            {
                const { x, y, z } = accelerometerData;

                // Calculate the total acceleration force
                const totalForce = Math.sqrt(x * x + y * y + z * z);

                const now = Date.now();
                if (totalForce > SHAKE_THRESHOLD && now - lastShakeTime > SHAKE_TIMEOUT)
                {
                    console.log('Shake detected!', totalForce);
                    setLastShakeTime(now);
                    if (onShake)
                    {
                        onShake();
                    }
                }
            });

            // Set the update interval for the accelerometer
            Accelerometer.setUpdateInterval(400); // Check for shakes every 400ms
        };

        startListening();

        // Cleanup function to remove the listener when the component unmounts
        return () =>
        {
            if (subscription)
            {
                subscription.remove();
            }
        };
    }, [onShake, lastShakeTime]);
};
