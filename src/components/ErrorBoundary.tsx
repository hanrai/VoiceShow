import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('可视化组件错误:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="error-state">
          可视化组件加载失败
        </div>
      );
    }

    return this.props.children;
  }
} 