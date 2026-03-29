# Publishing `sobivan.ru` on GitHub Pages

This folder is prepared for GitHub Pages.

Included:

- `CNAME` with `sobivan.ru`
- `.nojekyll`
- all local images and covers used by the site

## What I already prepared

- The site is ready as a static GitHub Pages site.
- The custom domain file is already added: `sobivan.ru`
- Local assets are used for posters, artist photos, and track covers.

## What you need to do yourself

1. Create a new GitHub repository for this site.
2. Upload the contents of this `sobivan` folder to the root of that repository.
3. In GitHub open:
   `Settings -> Pages`
4. Set:
   `Deploy from a branch`
5. Choose:
   `main` and `/root`
6. In the same `Pages` settings, make sure custom domain is:
   `sobivan.ru`

## DNS settings for `sobivan.ru`

At your domain registrar, add these `A` records for the apex domain:

- `185.199.108.153`
- `185.199.109.153`
- `185.199.110.153`
- `185.199.111.153`

Recommended IPv6 `AAAA` records:

- `2606:50c0:8000::153`
- `2606:50c0:8001::153`
- `2606:50c0:8002::153`
- `2606:50c0:8003::153`

Optional but recommended for `www.sobivan.ru`:

- Type: `CNAME`
- Host: `www`
- Value: `magarinikott.github.io`

## After DNS is added

1. Wait for DNS propagation.
2. Open GitHub `Settings -> Pages`
3. Enable `Enforce HTTPS` when it becomes available.

## Local preview

If needed, run:

```bash
cd /Users/kseniasoboleva/Desktop/alex\ ricellow/sobivan
python3 -m http.server 4174
```

Then open:

`http://localhost:4174`
