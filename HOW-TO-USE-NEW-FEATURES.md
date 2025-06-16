# How to Use New Features - Tridex Phase 2C

## 🎫 COUPON SYSTEM

### For Users (Frontend):

#### 1. Add to any page where you want coupons:
```html
<!-- Add these to your HTML head -->
<link rel="stylesheet" href="css/coupon-system.css">
<script src="js/coupon-system.js"></script>

<!-- Add this HTML where you want the coupon section -->
<div class="coupon-section">
    <h3>Have a Coupon?</h3>
    
    <!-- Coupon Input Form -->
    <form id="coupon-form" class="coupon-form">
        <input type="text" id="coupon-input" class="coupon-input" placeholder="Enter coupon code">
        <button type="submit" class="apply-coupon-btn">Apply</button>
    </form>
    
    <!-- Message Display -->
    <div id="coupon-message" class="coupon-message"></div>
    
    <!-- Applied Coupons -->
    <div id="applied-coupons"></div>
    
    <!-- Available Coupons -->
    <h4>Available Offers</h4>
    <div id="available-coupons"></div>
</div>
```

#### 2. Initialize the coupon system:
```javascript
// The system auto-initializes, but you can also manually set cart data:
if (window.couponSystem) {
    // Set your cart items and total
    window.couponSystem.setCartData(cartItems, cartTotal);
}
```

### For Admins:

#### 1. Access Admin Panel:
- Go to `admin-coupons.html`
- Click "Create New Coupon"
- Fill in the details and save

#### 2. Example Coupon Creation:
- **Code**: SAVE20
- **Name**: 20% Off Everything
- **Type**: Percentage
- **Value**: 20
- **End Date**: Set future date

---

## ⚡ FLASH SALE SYSTEM

### For Users (Frontend):

#### 1. Add to your homepage or product pages:
```html
<!-- Add these to your HTML head -->
<link rel="stylesheet" href="css/flash-sale-system.css">
<script src="js/flash-sale-system.js"></script>

<!-- Add this HTML where you want flash sales -->
<div class="flash-sales-section">
    <div class="flash-sales-header">
        <h2>⚡ Flash Sales</h2>
        <p>Limited time offers - Don't miss out!</p>
    </div>
    <div id="flash-sales-container"></div>
</div>
```

#### 2. The system will automatically:
- Load active flash sales
- Show countdown timers
- Display discounted prices
- Handle purchase buttons

### For Admins:

#### 1. Access Admin Panel:
- Go to `admin-flash-sales.html`
- Click "Create Flash Sale"

#### 2. Example Flash Sale Creation:
- **Name**: Weekend Flash Sale
- **Start Time**: Tomorrow 9 AM
- **End Time**: Sunday 11 PM
- **Add Products**: Search and select products
- **Set Sale Prices**: Discount from original prices

---

## 🛒 INTEGRATION WITH EXISTING CART

### Update your cart.html:
```html
<!-- Add after your existing cart items -->
<div class="coupon-section">
    <h3>Coupons & Discounts</h3>
    
    <form id="coupon-form" class="coupon-form">
        <input type="text" id="coupon-input" placeholder="Enter coupon code">
        <button type="submit">Apply Coupon</button>
    </form>
    
    <div id="coupon-message"></div>
    <div id="applied-coupons"></div>
</div>

<!-- Update your cart totals -->
<div class="cart-totals">
    <div class="total-row">
        <span>Subtotal:</span>
        <span id="cart-subtotal">₹0</span>
    </div>
    <div class="total-row">
        <span>Discount:</span>
        <span id="total-discount" class="total-discount">₹0</span>
    </div>
    <div class="total-row">
        <span>Total:</span>
        <span id="final-total">₹0</span>
    </div>
    <div id="total-savings" class="total-savings"></div>
</div>

<!-- Add the scripts -->
<script src="js/coupon-system.js"></script>
```

---

## 🏠 ADD TO HOMEPAGE

### Update your index.html:
```html
<!-- Add after your existing sections -->

<!-- Flash Sales Section -->
<section class="flash-sales-section">
    <div class="container">
        <div class="flash-sales-header">
            <h2>⚡ Flash Sales</h2>
            <p>Limited time offers - Hurry up!</p>
        </div>
        <div id="flash-sales-container"></div>
    </div>
</section>

<!-- Available Coupons Section -->
<section class="coupons-section">
    <div class="container">
        <h2>🎫 Current Offers</h2>
        <div id="available-coupons"></div>
    </div>
</section>

<!-- Add before closing body tag -->
<script src="js/flash-sale-system.js"></script>
<script src="js/coupon-system.js"></script>
```

---

## 📱 QUICK SETUP STEPS

### Step 1: Add CSS Files
Add these lines to the `<head>` of your HTML files:
```html
<link rel="stylesheet" href="css/coupon-system.css">
<link rel="stylesheet" href="css/flash-sale-system.css">
```

### Step 2: Add JavaScript Files
Add these before closing `</body>` tag:
```html
<script src="js/coupon-system.js"></script>
<script src="js/flash-sale-system.js"></script>
```

### Step 3: Add HTML Containers
Add these divs where you want the features to appear:
```html
<!-- For Flash Sales -->
<div id="flash-sales-container"></div>

<!-- For Coupons -->
<div id="available-coupons"></div>
<div id="applied-coupons"></div>
```

---

## 🔧 ADMIN ACCESS

### Coupon Management:
1. Open `admin-coupons.html` in your browser
2. Click "Create New Coupon"
3. Fill details and save
4. Coupons will automatically appear on frontend

### Flash Sale Management:
1. Open `admin-flash-sales.html` in your browser
2. Click "Create Flash Sale"
3. Add products and set sale prices
4. Set start/end times
5. Flash sales will automatically appear on frontend

---

## 💡 SIMPLE EXAMPLES

### Create a Quick Coupon:
1. Go to admin-coupons.html
2. Code: `WELCOME10`
3. Name: `Welcome Discount`
4. Type: `Percentage`
5. Value: `10`
6. Save

### Create a Quick Flash Sale:
1. Go to admin-flash-sales.html
2. Name: `Flash Sale`
3. Start: `Now`
4. End: `Tomorrow`
5. Add any product with 20% discount
6. Save

### Test on Frontend:
1. Add the HTML containers to any page
2. Include the CSS and JS files
3. Refresh the page
4. You'll see your coupons and flash sales!

---

## 🚨 IMPORTANT NOTES

1. **Server Must Be Running**: Make sure your Node.js server is running for the features to work
2. **Database**: The MongoDB database needs to be connected
3. **Admin Access**: Use the admin HTML files to create coupons and flash sales
4. **Auto-Display**: Once created, features automatically appear on frontend pages that include the code

Need help with any specific integration? Let me know which page you want to add these features to first!
