document.addEventListener('DOMContentLoaded', () => {
    const ingredientsGrid = document.getElementById('ingredients-grid');
    const searchInput = document.getElementById('ingredient-input');
    const resultsArea = document.getElementById('results-area');
    const totalCaloriesEl = document.getElementById('total-calories');
    const selectedItemsEl = document.getElementById('selected-items');

    // Modal elements
    const modalOverlay = document.getElementById('modal-overlay');
    const modalCloseBtn = document.getElementById('modal-close');
    const modalTitle = document.getElementById('modal-title');
    const modalCalories = document.getElementById('modal-calories');
    const modalDesc = document.getElementById('modal-desc');
    const modalImage = document.getElementById('modal-image');

    // Render the grid of ingredients
    function renderGrid() {
        ingredientsGrid.innerHTML = '';
        podravinaData.forEach(item => {
            const card = document.createElement('div');
            card.className = 'card';
            card.onclick = () => openModal(item);

            card.innerHTML = `
        <div class="card-image" style="background-image: url('${item.image}')"></div>
        <div class="card-content">
          <div class="card-title">${item.name}</div>
          <div class="card-calories">${item.calories} kcal / 100g</div>
        </div>
      `;
            ingredientsGrid.appendChild(card);
        });
    }

    // Open Modal
    function openModal(item) {
        modalTitle.textContent = item.name;
        modalCalories.textContent = `${item.calories} kcal / 100g`;
        modalDesc.textContent = item.description;
        modalImage.src = item.image;
        modalOverlay.classList.add('open');
    }

    // Close Modal
    function closeModal() {
        modalOverlay.classList.remove('open');
    }

    modalCloseBtn.onclick = closeModal;
    modalOverlay.onclick = (e) => {
        if (e.target === modalOverlay) closeModal();
    };

    // Input Handler for Calculator
    searchInput.addEventListener('input', (e) => {
        const text = e.target.value.toLowerCase();
        calculateCalories(text);
    });

    function calculateCalories(text) {
        if (!text.trim()) {
            resultsArea.classList.remove('active');
            return;
        }

        const inputs = text.split(',').map(s => s.trim()).filter(s => s);
        let total = 0;
        let foundItems = [];

        inputs.forEach(input => {
            // Simple matching logic: check if input string is part of any item name
            const match = podravinaData.find(item => item.name.toLowerCase().includes(input));
            if (match) {
                total += match.calories;
                foundItems.push(match.name);
            }
        });

        if (foundItems.length > 0) {
            resultsArea.classList.add('active');
            totalCaloriesEl.textContent = `${total} kcal`;

            selectedItemsEl.innerHTML = foundItems.map(name =>
                `<span class="tag">${name}</span>`
            ).join('');
        } else {
            resultsArea.classList.remove('active');
        }
    }

    // Initial Render
    renderGrid();
});
