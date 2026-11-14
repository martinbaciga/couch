Routes and API route handlers live here.

Pages compose feature components. They do not restyle shared components. API routes under `api/` validate input and return `{ error: { code, message } }` with `not_found`, `rate_limited`, `upstream_unavailable`, or `bad_request`.
