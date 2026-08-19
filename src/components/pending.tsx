"use client";

import { useFormStatus } from "react-dom";

/**
 * What a toggle should show while its form is in flight.
 *
 * Every control in this app is a form posting to the server, so a tap costs a
 * round trip before anything changes. With no sign that the tap registered, the
 * honest reading of a button that hasn't moved is that it didn't work — so it
 * gets tapped again, and again, and the app feels broken rather than slow.
 *
 * Showing the state it is *about* to be is as good as optimistic rendering here
 * and needs no extra state to hold: the target of a toggle is known the moment
 * it is pressed. If the server disagrees, its render replaces this one.
 *
 * Must be called from a component inside the <form>, which is what scopes
 * useFormStatus to that form rather than to some other one on the page.
 */
export function useToggleState(current: boolean) {
  const { pending } = useFormStatus();
  return { shown: pending ? !current : current, pending };
}

/** The same, where a press has a target value rather than an opposite. */
export function usePendingValue<T>(current: T, target: T) {
  const { pending } = useFormStatus();
  return { shown: pending ? target : current, pending };
}
