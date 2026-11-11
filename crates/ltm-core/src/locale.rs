use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Default, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "lowercase")]
#[ts(export)]
pub enum Locale {
    #[default]
    Ko,
    En,
}

impl std::str::FromStr for Locale {
    type Err = &'static str;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        match value {
            "ko" => Ok(Self::Ko),
            "en" => Ok(Self::En),
            _ => Err("unsupported language: use ko or en"),
        }
    }
}
