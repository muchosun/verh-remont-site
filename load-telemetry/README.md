# Independent load telemetry

Scope: root repair landing and `/design/`. No Metrika dependency. The early
bootstrap is embedded before styles by `node scripts/embed-load-telemetry.mjs`.
Run this after changing `assets/js/load-telemetry.js`.

Events: `html_started`, `dom_ready`, `first_contentful_paint`, `page_loaded`,
`form_ready`, `form_timeout` after 15 seconds, bounded `script_error` asset
classification; design also records CAPTCHA start/API ready/pass/error.
`form_ready` means handlers and local delivery helper are installed. It does
not mean the CAPTCHA passed or a lead was delivered.

The page ID is random per document, never stored in cookies or browser storage.
Fields contain only page class, elapsed time (capped at two minutes), viewport
class, coarse campaign channel, and QA marker. No phone, form contents, exact
URL, referrer, Metrika ID, or CAPTCHA token is accepted by the collector.
Platform request metadata is separate from the application payload.

Function: `d4en6jq9bmap0km3gicb`, Node.js 22, 128 MB, 3 seconds. No service
account or secret environment. One instance and ten concurrent queued requests
per zone; no provisioned instances. Lead delivery function is unchanged.
Public Origin checks reduce accidental submissions but are not authentication
or bot proof. Counts can contain automation; exclude `qa=true` and deduplicate
by `(page_id,event,asset)` when reading records.

Storage: structured Cloud Logging records named `verh_load_v1` in the existing
folder's default log group. As of deployment, Cloud Logging control/read APIs
return Unavailable/503, so durable write/read confirmation and retention
readback remain pending. The collector's HTTP 204 alone is not that proof.

This cannot count HTML that never arrived or a browser blocking all JavaScript
or the collector itself. Availability tests from Russian mobile operators and
hosting ingress logs remain separate checks. Emulated mobile is not such a test.
