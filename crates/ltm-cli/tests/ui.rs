#![cfg(unix)]

mod support;

use std::{
    fs,
    io::{BufRead, BufReader, Read, Write},
    net::TcpStream,
    os::unix::fs::PermissionsExt,
    process::{Child, Stdio},
    sync::mpsc::{self, Receiver},
    time::{Duration, Instant},
};
use support::Project;

struct Server {
    child: Child,
    stderr: Receiver<String>,
    url: String,
}

impl Server {
    fn start(project: &Project, no_open: bool, launcher_exit: Option<u8>) -> Self {
        project.init();
        let bin = project.path().join("bin");
        fs::create_dir(&bin).unwrap();
        if let Some(exit) = launcher_exit {
            let launcher = bin.join(if cfg!(target_os = "macos") { "open" } else { "xdg-open" });
            fs::write(
                &launcher,
                format!("#!/bin/sh\nprintf '%s' \"$1\" > \"$LTM_TEST_BROWSER_LOG\"\nexit {exit}\n"),
            )
            .unwrap();
            fs::set_permissions(&launcher, fs::Permissions::from_mode(0o700)).unwrap();
        }
        let mut command = project.command();
        command
            .args(["ui", "--port", "0"])
            .env("PATH", bin)
            .env("LTM_TEST_BROWSER_LOG", project.path().join("browser-url"))
            .stdout(Stdio::null())
            .stderr(Stdio::piped());
        if no_open {
            command.arg("--no-open");
        }
        let mut child = command.spawn().unwrap();
        let (sender, stderr) = mpsc::channel();
        let pipe = child.stderr.take().unwrap();
        std::thread::spawn(move || {
            for line in BufReader::new(pipe).lines() {
                if sender.send(line.unwrap()).is_err() {
                    break;
                }
            }
        });
        let mut server = Self { child, stderr, url: String::new() };
        let line = server.stderr.recv_timeout(Duration::from_secs(5)).unwrap();
        assert!(line.starts_with("LTM http://"), "server startup failed: {line}");
        server.url = line.strip_prefix("LTM ").unwrap().split_whitespace().next().unwrap().to_owned();
        server
    }

    fn assert_serving(&mut self) {
        assert!(self.child.try_wait().unwrap().is_none());
        let address = self.url.strip_prefix("http://").unwrap();
        let mut stream = TcpStream::connect(address).unwrap();
        stream.set_read_timeout(Some(Duration::from_secs(5))).unwrap();
        write!(stream, "GET /api/briefs HTTP/1.1\r\nHost: {address}\r\nConnection: close\r\n\r\n").unwrap();
        let mut response = String::new();
        stream.read_to_string(&mut response).unwrap();
        assert!(response.starts_with("HTTP/1.1 200"), "{response}");
    }
}

impl Drop for Server {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

#[test]
fn ui_opens_the_bound_url_and_launcher_failure_keeps_server_running() {
    for exit in [0, 1] {
        let project = Project::new();
        let mut server = Server::start(&project, false, Some(exit));
        let deadline = Instant::now() + Duration::from_secs(5);
        let log = project.path().join("browser-url");
        while fs::read_to_string(&log).unwrap_or_default() != server.url {
            assert!(Instant::now() < deadline, "browser was not given {}", server.url);
            std::thread::sleep(Duration::from_millis(10));
        }
        assert!(!server.url.ends_with(":0"));
        if exit != 0 {
            let warning = server.stderr.recv_timeout(Duration::from_secs(5)).unwrap();
            assert!(warning.contains("could not open browser"), "{warning}");
        }
        server.assert_serving();
    }
}

#[test]
fn ui_no_open_skips_browser() {
    let project = Project::new();
    let mut server = Server::start(&project, true, Some(0));
    server.assert_serving();
    assert!(!project.path().join("browser-url").exists());
}

#[test]
fn ui_missing_browser_keeps_server_running() {
    let project = Project::new();
    let mut server = Server::start(&project, false, None);
    let warning = server.stderr.recv_timeout(Duration::from_secs(5)).unwrap();
    assert!(warning.contains("could not open browser"), "{warning}");
    server.assert_serving();
}

#[test]
fn ui_bind_failure_does_not_open_browser() {
    let project = Project::new();
    let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
    let port = listener.local_addr().unwrap().port().to_string();
    // 실제 브라우저 명령 대신 존재하지 않는 PATH를 써서 바인드 실패만 관찰한다.
    let output =
        project.command().args(["ui", "--port", &port]).env("PATH", project.path()).output().unwrap();
    assert!(!output.status.success());
    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(stderr.contains("in use"), "{stderr}");
    assert!(!stderr.contains("could not open browser"), "{stderr}");
}
