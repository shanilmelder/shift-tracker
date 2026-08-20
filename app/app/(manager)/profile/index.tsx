// Manager profile route: re-exports the shared profile screen implementation rather than
// duplicating it — the screen's content and API calls are identical regardless of role
// (FR-023 applies to both). See app/(employee)/profile/index.tsx for the implementation.
export { default } from '../../(employee)/profile/index';
