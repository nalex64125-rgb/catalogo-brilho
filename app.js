// Configuration
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyCHryfeKiZeQ1FHCCEez6GQoqbpK_-X2jT2W34hr1arfupjVlQU4K2jdEod-Be-CMh/exec";
const ADMIN_PASS = "1234";
const businessPhone = "584120000000"; 

// State
let products = [];
let cart = [];

// DOM Elements
const productGrid = document.getElementById('productGrid');
const header = document.getElementById('header');
const cartSidebar = document.getElementById('cartSidebar');
const cartBtn = document.getElementById('cartBtn');
const closeCart = document.getElementById('closeCart');
const cartItems = document.getElementById('cartItems');
const cartCount = document.getElementById('cartCount');
const cartTotal = document.getElementById('cartTotal');
const checkoutBtn = document.getElementById('checkoutBtn');
const checkoutModal = document.getElementById('checkoutModal');
const modalOverlay = document.getElementById('modalOverlay');
const checkoutForm = document.getElementById('checkoutForm');
const cancelCheckout = document.getElementById('cancelCheckout');
const adminPanel = document.getElementById('adminPanel');
const productForm = document.getElementById('productForm');
const closeAdmin = document.getElementById('closeAdmin');
const adminLoginBtn = document.getElementById('adminLoginBtn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    setupEventListeners();
    checkAdminSession();
});

function setupEventListeners() {
    cartBtn.addEventListener('click', () => toggleCart(true));
    closeCart.addEventListener('click', () => toggleCart(false));
    checkoutBtn.addEventListener('click', () => {
        if (cart.length === 0) return alert('El carrito está vacío');
        toggleCart(false);
        toggleModal(true);
    });
    cancelCheckout.addEventListener('click', () => toggleModal(false));
    checkoutForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleOrder();
    });
    adminLoginBtn.addEventListener('click', loginAdmin);
    closeAdmin.addEventListener('click', () => toggleAdminPanel(false));
    productForm.addEventListener('submit', handleAddProduct);
    
    window.addEventListener('scroll', handleHeaderScroll);
}

// Data Handling
async function loadProducts() {
    productGrid.innerHTML = '<p style="text-align:center; grid-column: 1/-1;">Cargando catálogo real desde Google Sheets...</p>';
    try {
        const response = await fetch(WEB_APP_URL);
        products = await response.json();
        renderProducts(products);
        renderSidebar();
    } catch (error) {
        console.error("Error loading products:", error);
        productGrid.innerHTML = '<p style="text-align:center; grid-column: 1/-1;">Error al cargar productos. Verifica la conexión.</p>';
    }
}

async function handleAddProduct(e) {
    e.preventDefault();
    const submitBtn = productForm.querySelector('button[type="submit"]');
    submitBtn.innerText = "Guardando...";
    submitBtn.disabled = true;

    const file = document.getElementById('pFile').files[0];
    if (!file) {
        alert("Por favor selecciona una imagen");
        submitBtn.disabled = false;
        submitBtn.innerText = "Guardar Producto";
        return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
        const newProduct = {
            name: document.getElementById('pName').value,
            ref: document.getElementById('pRef').value,
            price: `$${document.getElementById('pPrice').value}`,
            department: document.getElementById('pDept').value,
            category: document.getElementById('pCategory').value,
            image: reader.result,
            desc: document.getElementById('pDesc').value
        };

        try {
            await fetch(WEB_APP_URL, {
                method: 'POST',
                mode: 'no-cors', // Important for GAS
                body: JSON.stringify(newProduct)
            });
            alert("Producto guardado exitosamente en Google Sheets");
            productForm.reset();
            toggleAdminPanel(false);
            loadProducts(); // Refresh
        } catch (error) {
            console.error("Error saving product:", error);
            alert("Error al guardar. Inténtalo de nuevo.");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = "Guardar Producto";
        }
    };
    reader.readAsDataURL(file);
}

// UI Rendering
function renderProducts(items) {
    if (items.length === 0) {
        productGrid.innerHTML = '<p style="text-align:center; grid-column: 1/-1;">No hay productos disponibles aún.</p>';
        return;
    }
    productGrid.innerHTML = items.map(product => `
        <div class="product-card glass">
            <img src="${product.image}" alt="${product.name}" class="product-image">
            <div class="product-info">
                <span class="product-tag">${product.department} | ${product.category}</span>
                <p style="font-size: 0.7rem; color: var(--text-muted);">Ref: ${product.ref || 'N/A'}</p>
                <h3 class="product-name">${product.name}</h3>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">${product.desc || ''}</p>
                <p class="product-price">${product.price}</p>
                <button onclick="addToCart('${product.id}')" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">Agregar al carrito</button>
            </div>
        </div>
    `).join('');
}

function renderSidebar() {
    const deptList = document.getElementById('deptList');
    const departments = [...new Set(products.map(p => p.department))];
    
    let html = `<li><a href="#" onclick="filterBy('all')">Todos</a></li>`;
    departments.forEach(dept => {
        const categories = [...new Set(products.filter(p => p.department === dept).map(p => p.category))];
        html += `
            <li class="has-submenu">
                <a href="#" onclick="toggleSubmenu(event)">${dept} ▾</a>
                <ul class="submenu">
                    ${categories.map(cat => `<li><a href="#" onclick="filterBy('${cat}', '${dept}')">${cat}</a></li>`).join('')}
                </ul>
            </li>
        `;
    });
    deptList.innerHTML = html;
}

// Logic Functions
function addToCart(productId) {
    const product = products.find(p => String(p.id) === String(productId));
    const existing = cart.find(p => String(p.id) === String(productId));
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    updateCartUI();
    toggleCart(true);
}

function changeQuantity(productId, delta) {
    const item = cart.find(p => String(p.id) === String(productId));
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) {
            cart = cart.filter(p => String(p.id) !== String(productId));
        }
        updateCartUI();
    }
}

function updateCartUI() {
    cartCount.innerText = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartItems.innerHTML = cart.map((item) => `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.name}">
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <p>${item.price}</p>
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem;">
                    <button onclick="changeQuantity('${item.id}', -1)" class="btn" style="padding: 2px 8px; background: rgba(255,255,255,0.1); border:none; color:white;">-</button>
                    <span style="font-size: 0.9rem;">${item.quantity}</span>
                    <button onclick="changeQuantity('${item.id}', 1)" class="btn" style="padding: 2px 8px; background: rgba(255,255,255,0.1); border:none; color:white;">+</button>
                </div>
            </div>
            <button onclick="changeQuantity('${item.id}', -${item.quantity})" style="background:transparent; border:none; color: #ff4444; cursor:pointer; margin-left:auto;">&times;</button>
        </div>
    `).join('');

    const total = cart.reduce((sum, item) => {
        const price = parseFloat(String(item.price).replace('$', '').replace(',', ''));
        return sum + (price * item.quantity);
    }, 0);
    cartTotal.innerText = `$${total.toLocaleString()}`;
}

function filterBy(category, dept) {
    if (category === 'all') {
        renderProducts(products);
    } else {
        const filtered = products.filter(p => p.category === category && p.department === dept);
        renderProducts(filtered);
    }
}

function toggleCart(force) {
    cartSidebar.classList.toggle('active', force);
}

function toggleModal(show) {
    checkoutModal.style.display = show ? 'block' : 'none';
    modalOverlay.style.display = show ? 'block' : 'none';
}

function toggleAdminPanel(show) {
    adminPanel.style.display = show ? 'block' : 'none';
    modalOverlay.style.display = show ? 'block' : 'none';
    if (show) renderAdminProducts();
}

function checkAdminSession() {
    if (localStorage.getItem('isAdmin') === 'true') {
        adminLoginBtn.innerText = "⭐ Panel Admin";
        return true;
    }
    return false;
}

function loginAdmin() {
    if (checkAdminSession()) {
        toggleAdminPanel(true);
        return;
    }

    const pass = prompt("Ingrese la contraseña de administrador:");
    if (pass === ADMIN_PASS) {
        localStorage.setItem('isAdmin', 'true');
        checkAdminSession(); // Update button text
        toggleAdminPanel(true);
    } else {
        alert("Contraseña incorrecta");
    }
}

function renderAdminProducts() {
    const grid = document.getElementById('adminProductGrid');
    grid.innerHTML = products.map(p => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid var(--glass-border);">
            <span>${p.name} (${p.department} > ${p.category})</span>
            <p style="font-size: 0.8rem; color: var(--text-muted);">(Gestionado vía Google Sheets)</p>
        </div>
    `).join('');
}

function handleOrder() {
    const name = document.getElementById('custName').value;
    const phone = document.getElementById('custPhone').value;
    const addr = document.getElementById('custAddr').value;
    const total = cartTotal.innerText;

    let orderDetails = cart.map(item => `- ${item.name} x${item.quantity} (${item.price})`).join('%0A');
    const message = `*NUEVO PEDIDO*%0A%0A*Cliente:* ${name}%0A*WhatsApp:* ${phone}%0A*Dirección:* ${addr}%0A%0A*Productos:*%0A${orderDetails}%0A%0A*TOTAL:* ${total}`;
    
    const whatsappUrl = `https://wa.me/${businessPhone}?text=${message}`;
    window.open(whatsappUrl, '_blank');
    
    cart = [];
    updateCartUI();
    toggleModal(false);
    alert('¡Pedido enviado exitosamente!');
}

function toggleSubmenu(e) {
    e.preventDefault();
    const submenu = e.target.nextElementSibling;
    submenu.classList.toggle('active');
}

function handleHeaderScroll() {
    if (window.scrollY > 50) {
        header.style.padding = '0.5rem 0';
        header.style.background = 'rgba(2, 6, 23, 0.95)';
    } else {
        header.style.padding = '1rem 0';
        header.style.background = 'rgba(30, 41, 59, 0.7)';
    }
}
