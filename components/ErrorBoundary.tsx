/**
 * Error Boundary Component
 * 
 * Catches React errors in the component tree and displays a fallback UI
 * instead of crashing the entire app. Integrates with Sentry for error tracking.
 * 
 * Usage:
 *   <ErrorBoundary fallback={<ErrorFallback />}>
 *     <YourComponent />
 *   </ErrorBoundary>
 * 
 * @module components/ErrorBoundary
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component that catches JavaScript errors anywhere in the child
 * component tree, logs those errors, and displays a fallback UI.
 */
class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI
        return {
            hasError: true,
            error,
            errorInfo: null,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        // Log error to console
        console.error('❌ [ErrorBoundary] Caught error:', error);
        console.error('❌ [ErrorBoundary] Error info:', errorInfo);

        // Update state with error details
        this.setState({
            error,
            errorInfo,
        });

        // Call custom error handler if provided
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }

        // Log to Sentry if available
        try {
            if (typeof Sentry !== 'undefined') {
                Sentry.captureException(error, {
                    contexts: {
                        react: {
                            componentStack: errorInfo.componentStack,
                        },
                    },
                });
            }
        } catch (sentryError) {
            console.error('Failed to log error to Sentry:', sentryError);
        }
    }

    handleReset = (): void => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            // Render custom fallback UI if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Render default error UI
            return (
                <View style={styles.container}>
                    <View style={styles.content}>
                        <Text style={styles.emoji}>😔</Text>
                        <Text style={styles.title}>Oops! Something went wrong</Text>
                        <Text style={styles.message}>
                            We've encountered an unexpected error. Don't worry, your data is safe.
                        </Text>

                        {__DEV__ && this.state.error && (
                            <View style={styles.errorDetails}>
                                <Text style={styles.errorTitle}>Error Details (Dev Only):</Text>
                                <Text style={styles.errorText}>
                                    {this.state.error.toString()}
                                </Text>
                                {this.state.errorInfo && (
                                    <Text style={styles.errorStack}>
                                        {this.state.errorInfo.componentStack}
                                    </Text>
                                )}
                            </View>
                        )}

                        <View style={styles.buttonContainer}>
                            <Button
                                title="Try Again"
                                onPress={this.handleReset}
                                color="#FF4500"
                            />
                        </View>
                    </View>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    content: {
        maxWidth: 400,
        alignItems: 'center',
    },
    emoji: {
        fontSize: 64,
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#11181C',
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: '#687076',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 24,
    },
    errorDetails: {
        width: '100%',
        backgroundColor: '#FEE2E2',
        borderRadius: 8,
        padding: 12,
        marginBottom: 24,
        maxHeight: 200,
    },
    errorTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#991B1B',
        marginBottom: 8,
    },
    errorText: {
        fontSize: 12,
        color: '#7F1D1D',
        fontFamily: 'monospace',
        marginBottom: 8,
    },
    errorStack: {
        fontSize: 10,
        color: '#991B1B',
        fontFamily: 'monospace',
    },
    buttonContainer: {
        width: '100%',
        maxWidth: 200,
    },
});

// Declare Sentry as optional global
declare const Sentry: any;

export default ErrorBoundary;
