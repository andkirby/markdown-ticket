# Test Cases for Markdown Section Parsing with Code Blocks

This document contains test cases that reveal the issue where `#` comments inside code blocks are incorrectly treated as markdown headers.

## Test Case 1: Single Code Block with Hash Comments

### Expected Behavior
- Should only detect 2 real sections: "Test Case 1" and "Expected Behavior"
- Should NOT create sections from comments inside the code block

### Content
```python
# This should be a comment, not a header
def example_function():
    # This comment also should not be a header
    print("Hello world")
    # This should not be a header either
    return True
```

## Test Case 2: Multiple Code Blocks

### Description
This tests multiple code blocks with different languages and hash comments.

### Python Block
```python
# Python comment 1
import os
# Python comment 2
def test():
    pass
```

### JavaScript Block
```javascript
// JavaScript comment (shouldn't create section)
/* Multi-line
   comment */
# This looks like a comment but isn't in JS
const x = 1;
```

### Shell Script Block
```bash
# Shell script comment 1
echo "test"
# Shell script comment 2
ls -la
```

## Test Case 3: Mixed Headers and Code Blocks

### Section 1
Regular markdown section.

```yaml
# YAML comment
database:
  # Another YAML comment
  host: localhost
```

### Section 2
Another markdown section.

```dockerfile
# Dockerfile comment
FROM ubuntu:20.04
# Another comment
RUN apt-get update
```

## Test Case 4: Edge Cases

### Unclosed Code Block
This should show what happens with an unclosed code block:

```
# Comment in unclosed block
This has no closing backticks
# Another comment

## This Should Not Be a Section
```

### Code Block with Header-Like Content
```markdown
# This is inside a code block
## This is also inside a code block
### And so is this
```

## Test Case 5: Real-world Example

### Implementation Details
Here's how we implement the feature:

```typescript
// Service class implementation
class TicketService {
  # Private field (should not be a header)
  # Another private field comment
  private tickets: Map<string, Ticket> = new Map();

  # Method comment (not a header)
  async createTicket(data: TicketData): Promise<Ticket> {
    # Implementation comment
    const ticket = new Ticket(data);
    # Store the ticket
    this.tickets.set(ticket.id, ticket);
    # Return the created ticket
    return ticket;
  }
}
```

### Configuration
```toml
# Configuration file
[database]
# Database settings
host = "localhost"
# Connection timeout
timeout = 5000
```

## Summary

If the MarkdownSectionService incorrectly parses these code blocks, it will create bogus sections like:
- "# This should be a comment, not a header"
- "# Python comment 1"
- "# Shell script comment 1"
- "# Private field (should not be a header)"

The correct behavior is to recognize that these `#` characters are inside code blocks and should not be treated as markdown headers.