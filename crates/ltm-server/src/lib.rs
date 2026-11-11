//! 프로젝트 저장소와 GUI용 HTTP 어댑터.

mod assets;
pub mod http;
mod store;

pub use store::{FileStore, StoreError};
