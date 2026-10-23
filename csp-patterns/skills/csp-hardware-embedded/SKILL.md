---
name: csp-hardware-embedded
description: "Hardware and embedded engineering: device-cloud interface contracts first, then board-level architecture, component selection and BOM, firmware/driver task scheduling, and staged bring-up. Use when working on MCU/RTOS firmware, PCB and circuit review, device protocols (MQTT/Modbus/UART/BLE/CAN), hardware-software co-debugging, board resource budgets, power and real-time constraints, or device telemetry/control integration with a backend."
version: 0.1.0
layer: 3
category: patterns
phase: build
domain: patterns
scope: implementation
tools: [Read, Write, Edit, Glob, Grep, Bash]
related_skills: [csp-integration-design, csp-api-tester, csp-systematic-debugging, csp-webhook-architecture, csp-observability-and-instrumentation]
---

# Hardware & Embedded Engineering

Firmware bugs are expensive because they are recovered over a wire, in the field, one device at a
time. This skill front-loads the two decisions that cause most of that cost: the **device↔cloud
interface contract** and the **board-level resource budget**.

## When to Use

- Defining or changing the protocol between a device and a backend
- Reviewing a circuit, PCB layout, or BOM before tape-out or ordering
- Writing or debugging MCU firmware, drivers, or an RTOS task schedule
- Bringing up a new board and integrating it with a cloud service
- Auditing power budget, real-time constraints, or memory/stack usage
- Assessing field-upgrade, rollback, or DFM readiness

## When NOT to Use

- Pure backend API design → `csp-integration-design`, `csp-api-tester`
- Cloud-side observability for device fleets → `csp-observability-and-instrumentation`
- A debugging session with no hardware dimension → `csp-systematic-debugging`

---

## Step 0 — Interface First

**Never write firmware before the device↔cloud contract is fixed.** Firmware is the hardest layer
to update; the contract is the cheapest thing to change while it is still a document.

Pin down, in writing, before any code:

| Element | Must specify |
|---|---|
| **Frame format** | Header, length field position, payload encoding (binary/CBOR/JSON), trailer, escaping |
| **Field semantics** | Every field's type, unit, range, endianness, and what an absent field means vs. a zero |
| **QoS** | At-most-once / at-least-once / exactly-once. Who retries. What duplicates do to the consumer |
| **Ordering & timing** | Is order guaranteed? Max staleness. Sampling interval. Timestamp source (device clock vs. server receive time) and clock-drift policy |
| **Retry & backoff** | Attempt count, exponential backoff base and cap, jitter, and what happens when the buffer fills |
| **Offline behaviour** | Store-and-forward depth, eviction policy (oldest-first vs. priority), resync on reconnect |
| **Versioning** | Where the schema version lives in the frame, and how an old device talks to a new server |
| **Security** | Authentication (per-device cert vs. shared key), transport encryption, key provisioning and rotation |
| **Error surface** | Every error code the device can emit and what the backend must do with each |

Deliverable: `docs/analysis/DEVICE-CONTRACT-{device}-{date}.md` with a worked example frame in
hex and its decoded fields. Both the firmware author and the backend author sign it.

## Protocol Selection

| Protocol | Choose when | Avoid when | Cost to know |
|---|---|---|---|
| **MQTT** | Constrained bandwidth, unreliable link, many devices → one backend, pub/sub fan-out, battery devices needing long idle | Device-to-device LAN talk, or when you need request/response semantics badly enough to fight the topic model | Broker is a new infrastructure dependency; QoS 1 duplicates must be idempotent |
| **Modbus (RTU/TCP)** | Industrial legacy interop, PLCs, sensors with an existing register map, deterministic master-poll | Anything needing push, events, or rich payloads — register maps encode poorly | Register map *is* the contract; document every address, scale and offset |
| **Raw UART / serial** | Board-to-board or MCU-to-module on the same PCB, bootloaders, debug consoles, no IP stack available | Beyond a few metres, or across a noise boundary without isolation and framing | No flow control by default; you own framing, escaping, and CRC |
| **BLE** | Battery-powered, phone-adjacent, proximity pairing, wearables, provisioning | Throughput beyond a few kB/s, or >~10 m range, or many-to-one dense deployments | MTU negotiation and connection-interval tuning dominate real throughput |
| **CAN / CAN-FD** | Automotive and mobile machinery, multi-node bus, hard real-time with prioritized arbitration, noisy EMI environments | Anything needing IP, or a star topology | Bit timing and termination are physical, not software; a missing 120 Ω looks like a firmware bug |
| **Wi-Fi / TCP-IP** | High throughput, existing network infrastructure, OTA updates, local APIs | Coin-cell powered devices; sites with no reliable AP | Power draw during association is the usual surprise |
| **LoRa / NB-IoT** | Kilometre range, years on a battery, tiny infrequent payloads | Anything chatty; duty-cycle-regulated regions constrain you legally | Payload size limits force schema minimalism |

When two candidates survive, decide on: **power × range × payload × installed base**, in that
order, then write the reason down.

## Step 1 — Board Architecture and Selection

### Selection rules

1. **Electrical robustness and testability outrank cost.** A part that is 30% cheaper and has no
   in-circuit test access costs more than the saving.
2. **Cost is controlled at architecture level, not at line-item level.** Cutting a resistor to save
   ¥0.01 while adding a field-failure mode is a bad trade.
3. **Pin, peripheral and power budgets must close before schematic capture.** See Step 2.
4. **Second-source every critical part.** A single-sourced MCU with 52-week lead time is a
   programme risk, not a procurement detail.
5. **Escalate conflicts to the architecture layer.** When firmware needs a pin that the power tree
   also needs, do not resolve it locally — surface the trade and let the system owner arbitrate.

### PCB review checklist

**Critical signals**
- [ ] High-speed clocks and differential pairs length-matched and impedance-controlled
- [ ] Analog and digital ground planes separated and joined at exactly one point
- [ ] Crystal placed close to the MCU, with a guard ring and no routed traces underneath
- [ ] Return paths for every high-speed signal are continuous (no plane splits under the trace)
- [ ] Sensitive analog inputs away from switching regulators and the antenna

**Power tree**
- [ ] Every rail's input/output capacitance meets the regulator datasheet's requirement, at the
      point of load — not only at the regulator
- [ ] Sequencing is correct for parts that require it (FPGA, multi-rail SoC)
- [ ] Inrush current is within connector, fuse and switch ratings
- [ ] Decoupling: bulk per rail plus 100 nF per power pin, placed adjacent to the pin
- [ ] Thermal: regulator and MOSFET dissipation computed at worst-case load, copper area sized
- [ ] Reverse-polarity and surge protection on every externally accessible rail

**Testability**
- [ ] Test points on every rail, every debug interface, and both sides of any current-sense resistor
- [ ] Test points are ≥ 1 mm pads on ≥ 2.54 mm centres, accessible with the enclosure on
- [ ] SWD/JTAG/UART console header present and not blocked by another component
- [ ] A way to force the device into bootloader/recovery mode without disassembly

**ESD / EMC**
- [ ] TVS or ESD array on every connector pin that leaves the enclosure
- [ ] Chassis ground strategy defined and consistent
- [ ] Cable entries filtered or shielded at the boundary
- [ ] No loop area between a signal and its return crossing a plane split

### Resource budget — must be explicit

Before schematic capture, produce this table with **numbers**, not "should be enough":

| Resource | Budget | Worst-case use | Headroom | Rule |
|---|---|---|---|---|
| Flash | e.g. 512 KB | firmware + 2 OTA slots + config | ≥ 20% | A/B dual-slot OTA needs 2× the image size to fit |
| RAM | e.g. 128 KB | static + heap peak + stack peak | ≥ 25% | Measured peak, not estimated |
| Stack | per task | deepest call chain incl. ISRs | ≥ 30% | Every task gets a declared size; see below |
| GPIO | physical pins | all peripherals + spares | ≥ 2 spare | Spares are how you fix a board without a respin |
| Timers/PWM/ADC | peripheral count | all concurrent uses | ≥ 1 spare | Conflicts surface at integration, not at design |
| Non-volatile writes | endurance cycles | worst-case write rate × product life | ≥ 2× life | EEPROM/flash wear-out is a scheduled field failure |

**Stack and memory budgeting rules:**
- Every RTOS task declares its stack size in one table, with the basis (measured high-water mark
  or computed worst-case chain).
- Enable stack-overflow detection and stack high-water-mark reporting in every build, including
  release. A stack overflow that only manifests in the field is unrecoverable.
- **Prefer static allocation.** `malloc` in firmware introduces fragmentation, non-deterministic
  timing, and a failure mode most code paths do not handle. If you must use a heap, size it once
  at boot, never free-and-realloc in a loop, and assert on allocation failure.
- ISRs use their own stack (or the MSP) — account for the deepest ISR nesting on top of the task
  it interrupts.

## Step 2 — Firmware, Drivers and Task Schedule

### Task decomposition

| Concern | Rule |
|---|---|
| ISR work | Minimum possible: set a flag, push to a queue, return. No blocking calls, no allocation, no logging |
| Driver layer | Owns the peripheral and the register map. Exposes a blocking-free API to the application |
| Application tasks | Split by **deadline class**, not by feature. Hard-real-time control never shares a priority band with telemetry upload |
| Priorities | Assign by deadline: shortest deadline = highest priority. Document the whole table so an interrupt-latency bug is diagnosable |
| Shared state | Protect with the shortest-held lock possible; prefer lock-free queues between ISRs and tasks |

### Real-time quantitative rules

- Compute **worst-case execution time (WCET)** for every periodic task, then verify total CPU load
  at the highest rate: `Σ (WCETᵢ / periodᵢ) ≤ 0.7`. Above 70% utilisation a burst or a retry
  misses a deadline, and the failure is intermittent — the hardest kind to debug.
- Bound **interrupt latency**: `(longest critical section) + (longest ISR chain) ≤ shortest hard deadline × 0.5`.
- Any task whose jitter matters must be measured, not assumed. Record actual min/max period in the
  bring-up log.
- **Watchdog**: fed from the *lowest-priority* task or an independent supervisor, never from a
  timer ISR. A watchdog that a hung main loop can still feed is decoration.
- **Timers**: never `delay()` in a control path. Use hardware timers or RTOS ticks, and state the
  tick resolution next to every timeout constant.

### Power quantitative rules

| Item | Rule |
|---|---|
| Budget | Sum every state's current × its duty fraction, including peripherals, and compare against the battery's usable capacity (typically 80% of nominal) |
| Measurement | Measure, do not trust datasheet typicals. Use a current probe across the supply; average over at least one full wake/sleep cycle |
| Sleep | Every idle path enters the deepest sleep compatible with its wake source. Enumerate wake sources explicitly |
| Radio | TX dominates. Batch uplinks; a 1 s transmission every 10 s costs ~10× more than one every 100 s |
| Wake time | Budget wake-to-first-sample. A fast wake with a short burst usually beats a slow wake with a long one |
| Brown-out | Define behaviour below the brown-out threshold: safe state, no partial writes, no bricked config |
| Target | State the goal as a number: e.g. "≥ 24 months on 2 × AA at 1 report/min" — then show the arithmetic |

## Step 3 — Bring-up and Co-debugging

Run these in order. Skipping a stage makes the next stage's failures unattributable.

### Stage A — Board self-test (three essentials)

1. **Peripheral read/write**: every sensor, memory and interface returns a plausible value over
   its real bus. A wrong but stable value means a wiring or config bug, not a dead part.
2. **Watchdog**: deliberately hang a task and confirm the device resets and reports the reset cause.
3. **Low power**: measure sleep current and confirm wake sources fire. Do this before adding
   application logic — later, the sleep paths get broken by "just one more" feature.

### Stage B — Protocol conformance

- Verify frames against the Step 0 contract **on the wire** (logic analyser or broker capture),
  not from the firmware's own log.
- Test in this order: nominal → malformed input → out-of-order → duplicate → link drop mid-frame →
  buffer full.
- Confirm the retry and backoff behaviour matches the contract, including jitter.

### Stage C — Cloud round trip

- Device → backend → device control command → device actuation, end to end.
- Idempotency: replay a captured command and confirm no double actuation.
- Offline: disconnect, generate backlog, reconnect, confirm resync and eviction policy.
- Clock: shift the device clock forward and back; confirm timestamp handling does not corrupt the
  series.

### Issue recording

Every bring-up issue is recorded with **reproducible steps**: board revision, firmware commit,
peripheral state, exact command sequence, observed vs. expected, and whether it survived a reset.
"Issue happens sometimes" is not a record — it is an unstarted investigation.

### Field upgrade

- **Dual-partition (A/B) with rollback is mandatory** for any device you cannot physically reach.
  One bad OTA bricks the fleet.
- Verify the image (signature + hash) **before** swapping the boot target.
- Bootloader counts failed boots and falls back to the known-good slot.
- The upgrade is resumable after power loss at every step.
- Report the running firmware version on every uplink so fleet state is queryable.

## DFM Checklist

Check before ordering, not after:

- [ ] Every part has a second source, or the single-source risk is documented and accepted
- [ ] No part with a lead time that breaks the build schedule
- [ ] No obsolete or NRND (not recommended for new designs) parts
- [ ] Footprints match the manufacturer's recommended land pattern, not a hand-drawn guess
- [ ] Panelization designed: edge clearance, fiducials, tooling holes, v-score vs. routed edges
- [ ] Assembly: no component on the opposite side of a heavy part that must be hand-soldered after reflow
- [ ] Silkscreen: every connector labelled with function *and* pin 1, polarity marked, test points numbered
- [ ] No design rule that the chosen fab/assembly house cannot hold at the quoted price
- [ ] Conformal coating, potting or enclosure sealing considered if the device sees moisture or dust
- [ ] Enclosure: connector mating force does not exceed what the PCB mounting can take
- [ ] Regulatory: the radio module is pre-certified, or the certification cost and timeline are budgeted
- [ ] Serial number / MAC / device-ID provisioning path defined for the production line
- [ ] Production test fixture has a defined pass/fail that does not depend on an operator's judgement

## Key Principles

- **Contract before code** — the interface document is the cheapest place to change the system.
- **Budgets are numbers, not adjectives** — "enough flash" is not a budget; 20% headroom at measured peak is.
- **Field recovery is a design requirement** — dual-slot OTA and a self-feeding watchdog are not nice-to-haves.
- **Measure on the wire** — firmware logs describe what the firmware believed, not what happened.
- **Escalate cross-layer conflicts** — pin, power and timing collisions belong to the architecture owner.

## Anti-Patterns

| Anti-pattern | Consequence | Instead |
|---|---|---|
| Writing firmware before the cloud contract exists | Two teams build incompatible assumptions; discovered at integration, fixed in the hardest layer | Step 0 first, both sides sign |
| `malloc` in a long-running task | Fragmentation → allocation failure after days in the field | Static allocation; assert on failure |
| Watchdog fed from a timer ISR | A hung main loop still resets the watchdog timer — no protection | Feed from the lowest-priority task |
| Delay loops in a control path | Jitter, missed deadlines, untestable timing | Hardware timers / RTOS ticks |
| Skipping the low-power stage until "later" | Sleep paths are broken by every feature added after; the budget never closes | Stage A.3 before application logic |
| Believing datasheet typical current | Battery life estimate is wrong by a factor that ships | Measure over a full wake/sleep cycle |
| Single OTA slot | One bad image bricks every device you cannot reach | A/B partitions with a boot-count fallback |
| Debugging from the firmware's own log | The log says what the code intended to send | Logic analyser or broker capture |
| Cutting test points to save board area | Every field failure becomes a disassembly and a probe hunt | Test points on every rail and debug interface |
| Resolving a pin conflict locally | Two subsystems silently depend on incompatible assumptions | Surface the trade to the architecture owner |
