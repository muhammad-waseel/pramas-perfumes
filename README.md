# Pramas Perfumes

A full-stack e-commerce store for a Pakistani perfume brand, built with **React, Node.js, Express and MongoDB**.
Customers can browse, filter and buy perfumes with Cash on Delivery, track their orders, and keep a wishlist. The store owner gets an admin panel to manage orders, products and stock.

> Pramas is a demo brand made for this portfolio project. Orders are not shipped and no payment is taken.

**Live demo:** _coming soon_

## Features

**Storefront**
- Home page with hero slider, shop-by-category tiles, best sellers, new arrivals and sale sections
- Shop page with category, scent family, price and sale filters, search by name or note, sorting and pagination
- Product pages with sizes and prices, stock warnings, fragrance notes, reviews from verified buyers and related perfumes
- Slide-out shopping bag with a free-delivery progress bar
- Checkout with Pakistani mobile number validation, city and province, discount codes, gift wrap and Cash on Delivery
- Order confirmation, order tracking by order number and phone, customer accounts with order history and cancellation
- Wishlist, responsive design for phones, tablets and desktops

**Admin panel**
- Dashboard: revenue, orders, average order value, customers, 14-day revenue chart, low-stock list, best sellers
- Orders: search and filter, move orders through pending → confirmed → shipped → delivered, or cancel (stock is returned)
- Products: add, edit, hide and show perfumes; prices, sale prices, stock per size, notes and photos

**Engineering**
- All prices, discounts and delivery fees are calculated on the server, never trusted from the browser
- Stock is reserved with optimistic locking, so two shoppers cannot buy the same last bottle
- JWT authentication, bcrypt password hashing, role-based admin routes, rate limiting, Helmet security headers
- 42 API tests with Jest and Supertest on an in-memory MongoDB
- GitHub Actions CI: tests, client build and Docker image build on every push

## Tech stack

| Layer | Tools |
| --- | --- |
| Frontend | React 19, React Router 7, Vite, CSS |
| Backend | Node.js, Express 5, Mongoose 8, JWT, bcrypt |
| Database | MongoDB Atlas |
| Testing | Jest, Supertest, mongodb-memory-server |
| DevOps | Docker, GitHub Actions, Render |

## Run it locally

```bash
git clone https://github.com/muhammad-waseel/pramas-perfumes.git
cd pramas-perfumes
npm run install:all
cp .env.example server/.env    # then fill in your MongoDB URI and secrets
npm run build
npm start                      # http://localhost:5000
```

The first start fills the store with 12 sample perfumes and creates the admin account from `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

Run the tests with `npm test`.

## Discount codes for trying the checkout

- `WELCOME10`: 10% off (up to Rs 1,000)
- `PRAMAS500`: Rs 500 off orders above Rs 4,000

## API overview

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/products` | List with filters, search, sort and pagination |
| GET | `/api/products/:slug` | Product details and related products |
| POST | `/api/products/:id/reviews` | Review (verified buyers only) |
| POST | `/api/orders/quote` | Server-side totals for the checkout |
| POST | `/api/orders` | Place a Cash on Delivery order |
| GET | `/api/orders/track` | Track by order number and phone |
| GET | `/api/orders/mine` | A customer's orders |
| POST | `/api/auth/register`, `/api/auth/login` | Accounts |
| GET | `/api/admin/stats` | Admin dashboard |
| PATCH | `/api/admin/orders/:id/status` | Update order status |
| POST/PUT/DELETE | `/api/admin/products` | Manage products |

## Credits

Product photos are from [Unsplash](https://unsplash.com) and used under the Unsplash License. Perfume names, notes and prices are invented for this demo.

Built by [Muhammad Waseel](https://muhammad-waseel.github.io).
