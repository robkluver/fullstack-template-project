# Retrospective: Phase 2 Calendar Frontend

## What Went Well

1. **Clean API layer separation**: Client, API functions, and hooks each have clear responsibilities
2. **React Query integration**: Proper query key management enables efficient caching and invalidation
3. **Component composition**: WeekView, EventCard, and EventModal are well-encapsulated
4. **Design Guidelines compliance**: All components follow CSS tokens and spacing system
5. **TypeScript strictness**: Caught potential runtime errors at compile time

## What Could Be Improved

1. **TypeScript handling**: Too many fixes needed for `exactOptionalPropertyTypes`
   - Future: Add this to awareness checklist before starting
2. **Component testing**: No tests written yet
3. **Timezone handling**: Currently using local timezone, need to add floating time support
4. **Drag-and-drop**: Not implemented yet for event rescheduling

## Technical Debt Created

1. [ ] Add unit tests for calendar hooks
2. [ ] Add component tests for WeekView, EventCard, EventModal
3. [ ] Implement floating timezone (local time) support per Product Vision
4. [ ] Add drag-to-reschedule functionality
5. [ ] Implement recurrence UI in EventModal
6. [ ] Add Day, Month, Year, and Agenda views
7. [ ] Add optimistic updates for better UX
8. [ ] Handle API errors more gracefully (toast notifications)

## Lessons Learned

- React Query's mutation invalidation pattern works well for calendar updates
- styled-jsx keeps component styles co-located but requires attention to specificity
- Next.js 16's `exactOptionalPropertyTypes` requires careful handling of optional fields
- The API client pattern with explicit method helpers (get, post, patch, delete) is clean

## Next Steps

1. **Day View** - Single day detailed timeline
2. **Month View** - Traditional calendar grid
3. **Recurrence UI** - Add RRULE builder to EventModal
4. **Drag-and-Drop** - Enable event rescheduling by dragging
5. **E2E Tests** - Calendar interactions with Playwright
