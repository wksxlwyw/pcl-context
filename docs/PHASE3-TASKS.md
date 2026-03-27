# Phase 3: Git Version Control

## Core Features
- [ ] GitManager implementation (auto-commit, rollback, snapshots)
- [ ] CLI commands: history/diff/rollback/snapshot  
- [ ] Integration with ContextStore for automatic versioning
- [ ] Performance optimization for Git operations

## Acceptance Criteria  
- [ ] pcl history shows change history
- [ ] pcl diff displays human-readable differences
- [ ] pcl rollback safely reverts changes  
- [ ] Git operations < 100ms P99
- [ ] All features pass end-to-end tests

## Technical Requirements
- Use simple-git library
- Auto-commit with 5s debounce  
- Human-readable diff formatting
- Safe rollback with confirmation

**Priority**: High
**Estimated Duration**: 1 week
