import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class SimpleErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 m-4 border-2 border-red-500 rounded-xl bg-red-50 text-red-900">
                    <h1 className="text-xl font-bold mb-4">Algo deu errado (Tela Branca)</h1>
                    <p className="mb-2">Ocorreu um erro ao renderizar esta página:</p>
                    <pre className="bg-black/10 p-4 rounded overflow-auto text-sm font-mono">
                        {this.state.error?.toString()}
                    </pre>
                    <button
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                        onClick={() => window.location.reload()}
                    >
                        Recarregar Página
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
