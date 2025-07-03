use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ErrorResponse {
    pub error: String,
}

impl ErrorResponse {
    pub fn new(error: impl Into<String>) -> Self {
        Self {
            error: error.into(),
        }
    }
}

impl fmt::Display for ErrorResponse {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.error)
    }
}

impl std::error::Error for ErrorResponse {}

impl From<anyhow::Error> for ErrorResponse {
    fn from(err: anyhow::Error) -> Self {
        Self::new(err.to_string())
    }
}

impl From<String> for ErrorResponse {
    fn from(err: String) -> Self {
        Self::new(err)
    }
}

impl From<&str> for ErrorResponse {
    fn from(err: &str) -> Self {
        Self::new(err)
    }
}

pub type Result<T> = std::result::Result<T, ErrorResponse>;