import ApplicationServices
import Carbon.HIToolbox
import Foundation
import os

let logger = Logger(subsystem: "io.github.k35o.capslock-awake", category: "agent")

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

var capsLockFilter: CFMachPort?

func startCapsLockFilter() {
    guard AXIsProcessTrusted() else { return }
    let events: [CGEventType] = [.keyDown, .keyUp, .flagsChanged]
    guard
        let tap = CGEvent.tapCreate(
            tap: .cgSessionEventTap,
            place: .headInsertEventTap,
            options: .defaultTap,
            eventsOfInterest: events.reduce(0) { $0 | 1 << CGEventMask($1.rawValue) },
            callback: { _, type, event, _ in
                if type == .tapDisabledByTimeout || type == .tapDisabledByUserInput {
                    if let capsLockFilter {
                        CGEvent.tapEnable(tap: capsLockFilter, enable: true)
                    }
                    return Unmanaged.passUnretained(event)
                }
                if type == .flagsChanged,
                    event.getIntegerValueField(.keyboardEventKeycode) == kVK_CapsLock
                {
                    return nil
                }
                event.flags.remove(.maskAlphaShift)
                return Unmanaged.passUnretained(event)
            },
            userInfo: nil
        )
    else { return }
    CFRunLoopAddSource(
        CFRunLoopGetMain(), CFMachPortCreateRunLoopSource(nil, tap, 0), .commonModes)
    capsLockFilter = tap
    logger.notice("caps lock filter started")
}

var applied = isCapsLockOn()
setSleepDisabled(applied)

AXIsProcessTrustedWithOptions([kAXTrustedCheckOptionPrompt.takeUnretainedValue(): true] as CFDictionary)

// アクセシビリティの許可はビルドし直すと外れる。許可がない間もスリープ抑止は動かしたいので、
// キーイベントではなく、権限なしで読める状態をポーリングする
let poll = DispatchSource.makeTimerSource(queue: .main)
poll.schedule(deadline: .now(), repeating: .milliseconds(250), leeway: .milliseconds(50))
poll.setEventHandler {
    if capsLockFilter == nil {
        startCapsLockFilter()
    }
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

// イベントタップは RunLoop で配信されるため、dispatchMain() ではなく RunLoop を回す
CFRunLoopRun()
