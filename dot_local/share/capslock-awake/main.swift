import CoreGraphics
import Foundation
import os

let logger = Logger(subsystem: "io.github.k35o.capslock-awake", category: "pmset")

func isCapsLockOn() -> Bool {
    CGEventSource.flagsState(.hidSystemState).contains(.maskAlphaShift)
}

func setSleepDisabled(_ disabled: Bool) {
    let pmset = Process()
    pmset.executableURL = URL(fileURLWithPath: "/usr/bin/sudo")
    pmset.arguments = ["-n", "/usr/bin/pmset", "-a", "disablesleep", disabled ? "1" : "0"]
    do {
        try pmset.run()
    } catch {
        logger.error("failed to run pmset: \(error)")
        exit(1)
    }
    pmset.waitUntilExit()
    // 失敗時に自前でリトライしないのは、launchd の再起動と起動時の同期で同じ状態に戻れるため
    guard pmset.terminationStatus == 0 else {
        logger.error("pmset exited with status \(pmset.terminationStatus)")
        exit(1)
    }
}

var applied = isCapsLockOn()
setSleepDisabled(applied)

// キーイベントの監視はアクセシビリティ権限が要るため、権限なしで読める状態をポーリングする
let poll = DispatchSource.makeTimerSource(queue: .main)
poll.schedule(deadline: .now(), repeating: .milliseconds(250), leeway: .milliseconds(50))
poll.setEventHandler {
    let capsLockOn = isCapsLockOn()
    guard capsLockOn != applied else { return }
    setSleepDisabled(capsLockOn)
    applied = capsLockOn
}
poll.resume()

signal(SIGTERM, SIG_IGN)
let terminate = DispatchSource.makeSignalSource(signal: SIGTERM, queue: .main)
terminate.setEventHandler {
    setSleepDisabled(false)
    exit(0)
}
terminate.resume()

dispatchMain()
