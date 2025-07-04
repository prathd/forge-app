pub mod branch;
pub mod stash;
pub mod status;
pub mod types;

pub use status::check_status;
pub use branch::{create as create_branch, checkout as checkout_branch};
pub use stash::stash as stash_changes;
pub use types::{GitStatus, GitCheckoutOptions, StashOptions};