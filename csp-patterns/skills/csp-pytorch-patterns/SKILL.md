---
name: csp-pytorch-patterns
description: PyTorch deep learning patterns and best practices for building robust, efficient, and reproducible training pipelines, model architectures, and data loading.
origin: CSP
layer: 4
category: patterns
---

| Pattern | Rule |
|---------|------|
| `model.train()` / `model.eval()` | Always set mode before train/eval |
| `torch.no_grad()` | Disable gradients for inference |
| `optimizer.zero_grad(set_to_none=True)` | More efficient gradient clearing |
| `.to(device)` | Device-agnostic tensor/model placement |
| `torch.amp.autocast` | Mixed precision for 2x speed |
| `pin_memory=True` | Faster CPU→GPU data transfer |
| `torch.compile` | JIT compilation for speed (2.0+) |
| `weights_only=True` | Secure model loading |
| `torch.manual_seed` | Reproducible experiments |
| `gradient_checkpointing` | Trade compute for memory |

## Anti-Patterns to Avoid

```python
# Bad: Forgetting model.eval() during validation
model.train()
with torch.no_grad():
    output = model(val_data)  # Dropout still active! BatchNorm uses batch stats!

# Good: Always set eval mode
model.eval()
with torch.no_grad():
    output = model(val_data)

# Bad: In-place operations breaking autograd
x = F.relu(x, inplace=True)  # Can break gradient computation
x += residual                  # In-place add breaks autograd graph

# Good: Out-of-place operations
x = F.relu(x)
x = x + residual

# Bad: Moving data to GPU inside the training loop repeatedly
for data, target in dataloader:
    model = model.cuda()  # Moves model EVERY iteration!

# Good: Move model once before the loop
model = model.to(device)
for data, target in dataloader:
    data, target = data.to(device), target.to(device)

# Bad: Using .item() before backward
loss = criterion(output, target).item()  # Detaches from graph!
loss.backward()  # Error: can't backprop through .item()

# Good: Call .item() only for logging
loss = criterion(output, target)
loss.backward()
print(f"Loss: {loss.item():.4f}")  # .item() after backward is fine

# Bad: Not using torch.save properly
torch.save(model, "model.pt")  # Saves entire model (fragile, not portable)

# Good: Save state_dict
torch.save(model.state_dict(), "model.pt")
```

__Remember__: PyTorch code should be device-agnostic, reproducible, and memory-conscious. When in doubt, profile with `torch.profiler` and check GPU memory with `torch.cuda.memory_summary()`.
