Static data, including the service catalogue. This is not a cache of TMDB responses.

## Adding an override

`resolveProvider` maps a TMDB provider id to a parent service in this order: `providerOverrides`, then the name rules, then the provider itself.

Name rules group "with Ads", "Standard with Ads", "Basic with Ads", and "Premium" under a parent whose name or alias matches what remains. Names ending in "Amazon Channel", "Apple TV Channel", or "Roku Premium Channel" stay their own service and are labelled with who resells them.

When a title is attached to the wrong service, add the TMDB provider id to `providerOverrides` in `services.ts`:

```ts
9: { serviceId: 119 },
1796: { serviceId: 8, variant: "ads", variantLabel: "with ads" },
```

`serviceId` is the parent id in the `services` list, which is that service's main TMDB provider id. Set `variant` to `"ads"` or `"tier"` when the plan should show the dashed note. Do not point a reseller channel at the brand it resells. Add a row to the `resolveProvider` tests for the case you fixed.
