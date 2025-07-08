use std::io;
use tracing::Level;
use tracing_appender::rolling;
use tracing_error::ErrorLayer;
use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt, EnvFilter, Registry};

/// Initialize the logging system with production-ready defaults
pub fn init() -> anyhow::Result<()> {
    // Create the base subscriber with environment filter
    let env_filter = EnvFilter::try_from_default_env()
        .or_else(|_| EnvFilter::try_new("info"))
        .unwrap_or_else(|_| EnvFilter::new("info"))
        .add_directive("forge_app=debug".parse()?)
        .add_directive("forge_app_lib=debug".parse()?);

    // Console logging layer with pretty formatting
    let console_layer = fmt::layer()
        .with_ansi(true)
        .with_target(true)
        .with_thread_ids(true)
        .with_file(true)
        .with_line_number(true)
        .with_level(true)
        .pretty();

    // Create the subscriber
    let subscriber = Registry::default()
        .with(env_filter)
        .with(ErrorLayer::default())
        .with(console_layer);

    // Initialize the global subscriber
    subscriber.init();

    Ok(())
}

/// Initialize logging with file output (for production)
pub fn init_with_file(log_dir: &str) -> anyhow::Result<()> {
    // Create rolling file appender
    let file_appender = rolling::daily(log_dir, "forge-app.log");
    let (non_blocking, _guard) = tracing_appender::non_blocking(file_appender);

    // Environment filter with production defaults
    let env_filter = EnvFilter::try_from_default_env()
        .or_else(|_| EnvFilter::try_new("info"))
        .unwrap_or_else(|_| EnvFilter::new("info"))
        .add_directive("forge_app=info".parse()?)
        .add_directive("forge_app_lib=info".parse()?)
        .add_directive("tokio=warn".parse()?)
        .add_directive("hyper=warn".parse()?);

    // Console layer with compact formatting for production
    let console_layer = fmt::layer()
        .with_ansi(true)
        .with_target(false)
        .with_thread_ids(false)
        .compact();

    // File layer with JSON formatting for structured logs
    let file_layer = fmt::layer()
        .with_writer(non_blocking)
        .with_ansi(false)
        .with_target(true)
        .with_thread_ids(true)
        .with_file(true)
        .with_line_number(true)
        .json();

    // Create the subscriber with both console and file layers
    let subscriber = Registry::default()
        .with(env_filter)
        .with(ErrorLayer::default())
        .with(console_layer)
        .with(file_layer);

    // Initialize the global subscriber
    subscriber.init();

    // Keep the guard alive for the lifetime of the application
    std::mem::forget(_guard);

    Ok(())
}

/// Initialize logging for tests with minimal output
#[cfg(test)]
pub fn init_test() {
    let _ = fmt()
        .with_env_filter(EnvFilter::new("debug"))
        .with_test_writer()
        .try_init();
}

/// Helper to create a span for async operations
#[macro_export]
macro_rules! span {
    ($name:expr) => {
        tracing::info_span!($name)
    };
    ($name:expr, $($field:tt)*) => {
        tracing::info_span!($name, $($field)*)
    };
}

/// Helper for logging errors with context
#[macro_export]
macro_rules! log_error {
    ($err:expr) => {
        tracing::error!(error = ?$err, "Operation failed");
    };
    ($err:expr, $msg:expr) => {
        tracing::error!(error = ?$err, $msg);
    };
    ($err:expr, $msg:expr, $($field:tt)*) => {
        tracing::error!(error = ?$err, $($field)*, $msg);
    };
}