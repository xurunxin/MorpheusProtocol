# Worker task start v1

`agent-os-worker-task-start/v1` has one business operation, `task.start`. It accepts commandId, prompt, title, nonempty acceptanceCriteria and initial foreground/background mode. The private channel owner resolves the recipient, parent/child Runs, WorkItems, budget, trusted code/workspace revision and validation policy. Unknown authority fields are rejected. Parsing never grants access.

The owner persists the complete business command before remote mutations. An exact command retry returns the same TaskHandle; changed metadata or mode with the same commandId conflicts. Changing delivery later uses existing `task.set-delivery` on that handle, not a new start. A transport requestId may change without creating another command.

The response binds the complete request and a real TaskHandle whose inputDigest matches the canonical prompt digest. Canonical prompt JSON recursively sorts object keys by code point and preserves array order. The handle is a reference, not proof of authority; WorkItem, parent Kernel child and scope must be verified by their owners.

Task acceptance does not imply execution success, output delivery, completed verification or artifacts. Those remain distinct fields in existing TaskView. Foreground/background selects delivery only; neither mode creates a second execution. Aborting an SDK request does not cancel a Run. If a reply is lost, an explicit exact command retry is required; the SDK never retries on its own.

This release adds the contract and stateless SDK. Worker production implementation and G4 process evidence are separate integration gates.
