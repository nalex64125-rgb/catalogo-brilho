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
const loginModal = document.getElementById('loginModal');
const adminPassInput = document.getElementById('adminPassInput');
const confirmLogin = document.getElementById('confirmLogin');
const cancelLogin = document.getElementById('cancelLogin');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    setupEventListeners();
    
    // REAL-TIME UPDATE: Refresh products every 15 seconds
    setInterval(loadProducts, 15000);
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
    
    adminLoginBtn.addEventListener('click', () => toggleLoginModal(true));
    closeAdmin.addEventListener('click', () => toggleAdminPanel(false));
    productForm.addEventListener('submit', handleAddProduct);
    
    confirmLogin.addEventListener('click', handleLogin);
    cancelLogin.addEventListener('click', () => toggleLoginModal(false));
    
    window.addEventListener('scroll', handleHeaderScroll);
}

// Data Handling
async function loadProducts() {
    // Add timestamp to bypass cache
    const urlWithCacheBuster = `${WEB_APP_URL}?t=${new Date().getTime()}`;
    
    try {
        const response = await fetch(urlWithCacheBuster);
        const data = await response.json();
        
        // Only re-render if something changed, to avoid flicker
        if (JSON.stringify(products) !== JSON.stringify(data)) {
            products = data;
            renderProducts(products);
            renderSidebar();
            if (adminPanel.style.display === 'block') renderAdminProducts();
        }
    } catch (error) {
        console.error("Error loading products:", error);
    }
}

async function handleAddProduct(e) {
    e.preventDefault();
    const submitBtn = productForm.querySelector('button[type="submit"]');
    submitBtn.innerText = "Guardando...";
    submitBtn.disabled = true;

    const file = document.getElementById('pFile').files[0];
    if (!file) {
        alert("Selecciona una imagen");
        submitBtn.disabled = false;
        submitBtn.innerText = "Guardar";
        return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
        const item = {
            name: document.getElementById('pName').value,
            ref: document.getElementById('pRef').value,
            price: document.getElementById('pPrice').value,
            department: document.getElementById('pDept').value,
            category: document.getElementById('pCategory').value,
            image: reader.result,
            desc: document.getElementById('pDesc').value
        };

        try {
            await fetch(WEB_APP_URL, {
                method: 'POST',
                mode: 'no-cors',
                body: JSON.stringify(item)
            });
            alert("Producto guardado exitosamente");
            productForm.reset();
            loadProducts();
            toggleAdminPanel(false);
        } catch (error) {
            alert("Error al guardar");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = "Guardar";
        }
    };
    reader.readAsDataURL(file);
}

async function deleteProduct(id) {
    if (!confirm('¿Seguro que deseas eliminar este producto?')) return;
    
    try {
        await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ action: 'DELETE', id: id })
        });
        alert("Enviando orden de eliminación...");
        loadProducts();
    } catch (error) {
        alert("Error al eliminar");
    }
}

// UI Functions
function renderProducts(items) {
    if (!items || items.length === 0) {
        productGrid.innerHTML = '<p style="text-align:center; grid-column: 1/-1; padding: 5rem;">No hay productos registrados en tu Google Sheets.</p>';
        return;
    }
    productGrid.innerHTML = items.map(p => `
        <div class="product-card glass">
            <img src="${p.image}" alt="${p.name}" class="product-image">
            <div class="product-info">
                <span class="product-tag">${p.department || 'General'} | ${p.category || 'Otros'}</span>
                <p style="font-size: 0.7rem; color: var(--text-muted);">Ref: ${p.ref || 'N/A'}</p>
                <h3 class="product-name">${p.name}</h3>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">${p.desc || ''}</p>
                <p class="product-price">$${formatPrice(p.price)}</p>
                <button onclick="addToCart('${p.id}')" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">Agregar al carrito</button>
            </div>
        </div>
    `).join('');
}

function renderSidebar() {
    const deptList = document.getElementById('deptList');
    if (!deptList) return;
    
    const departments = [...new Set(products.map(p => p.department).filter(Boolean))];
    let html = `<li><a href="#" onclick="filterBy('all')">Todos</a></li>`;
    
    departments.forEach(dept => {
        const categories = [...new Set(products.filter(p => p.department === dept).map(p => p.category).filter(Boolean))];
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

function renderAdminProducts() {
    const grid = document.getElementById('adminProductGrid');
    grid.innerHTML = products.map(p => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid var(--glass-border);">
            <div>
                <p style="font-weight: bold; margin: 0;">${p.name}</p>
                <p style="font-size: 0.75rem; color: var(--text-muted); margin: 0;">${p.department} > ${p.category}</p>
            </div>
            <button onclick="deleteProduct('${p.id}')" style="background: none; border: 1px solid #ff4444; color: #ff4444; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">Eliminar</button>
        </div>
    `).join('');
}

// Cart Logic
function addToCart(pid) {
    const product = products.find(p => String(p.id) === String(pid));
    if (!product) return;

    const existing = cart.find(c => String(c.id) === String(pid));
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    updateCartUI();
    toggleCart(true);
}

function changeQuantity(pid, delta) {
    const item = cart.find(c => String(c.id) === String(pid));
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) {
        cart = cart.filter(c => String(c.id) !== String(pid));
    }
    updateCartUI();
}

function updateCartUI() {
    cartCount.innerText = cart.reduce((s, i) => s + i.quantity, 0);
    cartItems.innerHTML = cart.map(i => `
        <div class="cart-item">
            <img src="${i.image}">
            <div class="cart-item-info">
                <h4>${i.name}</h4>
                <p>$${formatPrice(i.price)}</p>
                <div style="display:flex; align-items:center; gap: 0.5rem; margin-top:0.3rem;">
                    <button onclick="changeQuantity('${i.id}', -1)" style="background:rgba(255,255,255,0.1); border:none; color:white; width:24px;">-</button>
                    <span>${i.quantity}</span>
                    <button onclick="changeQuantity('${i.id}', 1)" style="background:rgba(255,255,255,0.1); border:none; color:white; width:24px;">+</button>
                </div>
            </div>
            <button onclick="changeQuantity('${i.id}', -${i.quantity})" style="background:none; border:none; color:#ff4444; cursor:pointer;">&times;</button>
        </div>
    `).join('');

    const total = cart.reduce((s, i) => s + (parsePrice(i.price) * i.quantity), 0);
    cartTotal.innerText = `$${total.toLocaleString()}`;
}

// Utilities
function formatPrice(p) {
    return p ? parsePrice(p).toLocaleString() : '0';
}
function parsePrice(p) {
    return parseFloat(String(p).replace(/[$\s,]/g, '')) || 0;
}

function filterBy(cat, dept) {
    if (cat === 'all') renderProducts(products);
    else renderProducts(products.filter(p => p.category === cat && p.department === dept));
}

function toggleCart(s) { cartSidebar.classList.toggle('active', s); }
function toggleModal(s) { 
    checkoutModal.style.display = s ? 'block' : 'none';
    modalOverlay.style.display = s ? 'block' : 'none';
}
function toggleAdminPanel(s) {
    adminPanel.style.display = s ? 'block' : 'none';
    modalOverlay.style.display = s ? 'block' : 'none';
    if (s) renderAdminProducts();
}
function toggleLoginModal(s) {
    loginModal.style.display = s ? 'block' : 'none';
    modalOverlay.style.display = s ? 'block' : 'none';
    if (s) adminPassInput.focus();
}

function handleLogin() {
    if (adminPassInput.value === ADMIN_PASS) {
        toggleLoginModal(false);
        toggleAdminPanel(true);
    } else {
        alert("Clave incorrecta");
    }
    adminPassInput.value = '';
}

function handleOrder() {
    const name = document.getElementById('custName').value;
    const phone = document.getElementById('custPhone').value;
    const addr = document.getElementById('custAddr').value;
    const total = cartTotal.innerText;
    const details = cart.map(i => `- ${i.name} x${i.quantity} ($${formatPrice(i.price)})`).join('%0A');
    const msg = `*NUEVO PEDIDO*%0A%0A*Cliente:* ${name}%0A*WhatsApp:* ${phone}%0A*Dir:* ${addr}%0A%0A*Productos:*%0A${details}%0A%0A*TOTAL:* ${total}`;
    window.open(`https://wa.me/${businessPhone}?text=${msg}`, '_blank');
    cart = []; updateCartUI(); toggleModal(false);
}

function toggleSubmenu(e) {
    e.preventDefault();
    e.target.nextElementSibling.classList.toggle('active');
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
