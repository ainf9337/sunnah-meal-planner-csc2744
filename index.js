// API Configuration
const API_KEY = 'a118f9fc5cec4bd886255ffb663b82e7';

// Haram ingredients filter
const haramIngredients = [
    //Pork and derivatives
    "pork", "bacon", "ham", "gelatin", "lard", "hog", "prosciutto", "sausage", "pepperoni", "speck", "pig", "sow", "chorizo",
    //Alcoholic beverages
    "wine", "beer", "cider", "rum", "brandy", "whiskey", "vodka", "alcohol", "bourbon", "gin", "brandy", "tequila", "champagne", "liqueur", "sake", "sherry", "port", "vermouth", "mead", 
    //Non-halal additives or flavorings
    "bacon bits", "bacon grease", "beer batter", "wine vinegar", "rum extract"
];

// Function to check if recipe contains haram ingredients
function containsHaramIngredients(recipe) {
    const allIngredients = [
        ...recipe.usedIngredients.map(ing => ing.name.toLowerCase()),
        ...recipe.missedIngredients.map(ing => ing.name.toLowerCase())
    ];
    
    return haramIngredients.some(haram => 
        allIngredients.some(ingredient => 
            ingredient.includes(haram.toLowerCase())
        )
    );
}

// Function to filter out haram recipes
function filterHaramRecipes(recipes) {
    return recipes.filter(recipe => !containsHaramIngredients(recipe));
}

// Application State
let currentMealPlan = JSON.parse(localStorage.getItem('sunnahMealPlan')) || {};
let mealToAdd = null;

// Initialize Application
function init() {
    loadEventListeners();
    switchView('search');
    renderMealPlan();
    showToast('Sunnah Meal Planner loaded successfully! 🎉', 'success');
}

// Event Listeners
function loadEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const view = e.target.dataset.view;
            switchView(view);
        });
    });

    // Search functionality
    document.getElementById('searchButton').addEventListener('click', performSearch);
    document.getElementById('ingredientInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });

    // Suggestion tags
    document.querySelectorAll('.suggestion-tag').forEach(tag => {
        tag.addEventListener('click', (e) => {
            document.getElementById('ingredientInput').value = e.target.dataset.ingredient;
            performSearch();
        });
    });

    document.getElementById('confirmAddMealBtn').addEventListener('click', saveNewMealToPlan);

    // Modal functionality
    document.getElementById('saveEditButton').addEventListener('click', saveMealEdit);
    document.getElementById('cancelEditButton').addEventListener('click', closeModal);
    document.querySelector('.close-btn').addEventListener('click', closeModal);
    document.getElementById('editModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('editModal') || e.target.classList.contains('modal-overlay')) {
            closeModal();
        }
    });

    // Clear plan and Export
    document.getElementById('clearPlanBtn').addEventListener('click', clearMealPlan);
    document.getElementById('exportPlanBtn').addEventListener('click', exportMealPlan); // ADD THIS LINE
}

// View Management
function switchView(viewName) {
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    document.getElementById(`${viewName}View`).classList.add('active');

    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-view="${viewName}"]`).classList.add('active');

    if (viewName === 'plan') {
        renderMealPlan();
    }
}

// API Functions
async function performSearch() {
    const ingredients = document.getElementById('ingredientInput').value.trim();
    if (!ingredients) {
        showToast('Please enter at least one ingredient', 'error');
        return;
    }

    const loadingSpinner = document.getElementById('loadingSpinner');
    const searchButton = document.querySelector('.search-btn');
    
    loadingSpinner.classList.remove('hidden');
    searchButton.disabled = true;
    document.querySelector('.btn-text').textContent = 'Searching...';
    document.querySelector('.loading-spinner').classList.remove('hidden');

    try {
        const url = `https://api.spoonacular.com/recipes/findByIngredients?apiKey=${API_KEY}&ingredients=${ingredients}&number=12&ranking=1`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        displayRecipes(data);
        
    } catch (error) {
        console.error('Error fetching recipes:', error);
        showRecipeError('Failed to load recipes. Please check your internet connection and try again.');
    } finally {
        loadingSpinner.classList.add('hidden');
        searchButton.disabled = false;
        document.querySelector('.btn-text').textContent = 'Search Recipes';
        document.querySelector('.loading-spinner').classList.add('hidden');
    }
}

function displayRecipes(recipes) {
    const recipeGrid = document.getElementById('recipeGrid');
    
    if (!recipes || recipes.length === 0) {
        showRecipeError('No recipes found for these ingredients. Try different Sunnah foods like dates, honey, olives, milk, or barley.');
        return;
    }

    // Filter out recipes with haram ingredients
    const halalRecipes = filterHaramRecipes(recipes);
    
    if (halalRecipes.length === 0) {
        showRecipeError('No halal recipes found for these ingredients. The recipes found contain non-halal ingredients. Try different Sunnah foods.');
        return;
    }

    // Show message if some recipes were filtered out
    if (halalRecipes.length < recipes.length) {
        const filteredCount = recipes.length - halalRecipes.length;
        showToast(`Filtered out ${filteredCount} recipe(s) containing non-halal ingredients`, 'warning');
    }

    recipeGrid.innerHTML = halalRecipes.map(recipe => `
        <div class="recipe-card">
            <img src="${recipe.image}" alt="${recipe.title}" class="recipe-image" 
                 onerror="this.src='https://via.placeholder.com/300x200/f8f5f0/666666?text=No+Image+Available'">
            <div class="recipe-content">
                <h3 class="recipe-title">${recipe.title}</h3>
                <div class="recipe-ingredients">
                    <p class="ingredient-list">
                        <strong>Used Ingredients:</strong> ${recipe.usedIngredients.map(ing => ing.name).join(', ')}
                    </p>
                    ${recipe.missedIngredients.length > 0 ? `
                        <p class="ingredient-list">
                            <strong>Missing Ingredients:</strong> ${recipe.missedIngredients.map(ing => ing.name).join(', ')}
                        </p>
                    ` : ''}
                </div>
                <div class="recipe-actions">
                    <button class="btn btn-primary" onclick="openDaySelectionModal(${recipe.id}, '${recipe.title.replace(/'/g, "\\'")}', '${recipe.image}')">
                    Add to Plan
                </button>
                <button class="btn btn-outline" onclick="viewRecipeDetails(${recipe.id})">
                    Details
                </button>
                </div>
            </div>
        </div>
    `).join('');
}

function showRecipeError(message) {
    const recipeGrid = document.getElementById('recipeGrid');
    recipeGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
            <div style="font-size: 4rem; margin-bottom: 1rem;">🍽️</div>
            <p style="color: var(--text-light); font-size: 1.1rem; margin-bottom: 0.5rem;">${message}</p>
            <p style="color: var(--text-light); font-size: 0.9rem;">Try searching for ingredients like dates, honey, olives, or milk</p>
        </div>
    `;
}

async function viewRecipeDetails(recipeId) {
    try {
        showToast('Loading recipe details...', 'warning');
        
        const url = `https://api.spoonacular.com/recipes/${recipeId}/information?apiKey=${API_KEY}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Failed to fetch recipe details');
        }
        
        const recipe = await response.json();
        
        // Check for haram ingredients in the detailed recipe
        const allIngredients = recipe.extendedIngredients || [];
        const hasHaram = allIngredients.some(ing => 
            haramIngredients.some(haram => 
                ing.name.toLowerCase().includes(haram.toLowerCase())
            )
        );
        
        if (hasHaram) {
            showToast('This recipe contains non-halal ingredients', 'error');
            return;
        }
        
        showRecipeModal(recipe);
        
    } catch (error) {
        console.error('Error fetching recipe details:', error);
        showToast('Could not load recipe details', 'error');
    }
}

function showRecipeModal(recipe) {
    const modalHTML = `
        <div class="modal" id="recipeModal">
            <div class="modal-overlay"></div>
            <div class="modal-content" style="max-width: 500px; max-height: 80vh; overflow-y: auto;">
                <div class="modal-header" style="position: sticky; top: 0; background: white; z-index: 10;">
                    <h3 style="margin: 0; font-size: 1.2rem;">${recipe.title}</h3>
                    <button class="close-btn" onclick="closeRecipeModal()" style="font-size: 1.5rem; padding: 0; background: none; border: none; cursor: pointer;">&times;</button>
                </div>
                <div class="modal-body" style="padding: 1rem;">
                    <img src="${recipe.image}" alt="${recipe.title}" style="width: 100%; border-radius: 8px; margin-bottom: 1rem;">
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; font-size: 0.9rem;">
                        <div>
                            <strong>Ready in:</strong> ${recipe.readyInMinutes} minutes
                        </div>
                        <div>
                            <strong>Servings:</strong> ${recipe.servings}
                        </div>
                    </div>
                    
                    ${recipe.summary ? `
                        <div style="margin-bottom: 1rem;">
                            <strong>Summary:</strong>
                            <p style="margin-top: 0.5rem; font-size: 0.9rem; line-height: 1.4;">${recipe.summary.replace(/<[^>]*>/g, '')}</p>
                        </div>
                    ` : ''}
                    
                    <button class="btn btn-primary" 
                            onclick="openDaySelectionModal(${recipe.id}, '${recipe.title.replace(/'/g, "\\'")}', '${recipe.image}'); closeRecipeModal();" 
                            style="width: 100%; margin-top: 1rem;">
                        Add to Meal Plan
                    </button>

                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('recipeModal').classList.remove('hidden');
}

function closeRecipeModal() {
    const modal = document.getElementById('recipeModal');
    if (modal) {
        modal.remove();
    }
}

// --- New Day Selection Modal Logic ---

function openDaySelectionModal(recipeId, recipeTitle, recipeImage) {
    // Store data temporarily
    mealToAdd = { 
        recipeId: recipeId, 
        title: recipeTitle,
        image: recipeImage // Include image for better data storage/retrieval later
    };

    // Assuming you have an HTML element with id="daySelectionModal"
    // and it's hidden by default via CSS.
    const modal = document.getElementById('daySelectionModal');
    if (modal) {
        modal.classList.remove('hidden'); // Show the modal
    }
}

function closeDaySelectionModal() {
    const modal = document.getElementById('daySelectionModal');
    if (modal) {
        modal.classList.add('hidden'); // Hide the modal
    }
    mealToAdd = null; // Clear the temporary data
}

// --- New function to handle the final saving of a meal ---
function saveNewMealToPlan() {
    if (!mealToAdd) {
        showToast('Error: Recipe data missing.', 'error');
        return;
    }
    
    // 1. Get the selected day from the new dropdown element
    const selectedDayElement = document.getElementById('mealDaySelector');
    if (!selectedDayElement) {
        showToast('Error: Day selector not found.', 'error');
        return;
    }
    
    const selectedDay = selectedDayElement.value.toLowerCase(); // Ensure lowercase for consistent storage
    
    // 2. Call the new, private function to do the actual data manipulation
    _addMealToPlan(mealToAdd.recipeId, mealToAdd.title, selectedDay); 
    
    // 3. Provide feedback and cleanup
    closeDaySelectionModal();
    showToast(`"${mealToAdd.title}" added to ${selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)}'s plan!`, 'success');
    renderMealPlan(); // Refresh the plan view if visible
}

// CRUD Operations: Private helper function for adding a meal
// This replaces your old addToMealPlan function, now it takes a 'day' argument
function _addMealToPlan(recipeId, recipeTitle, day) {
    
    // Use the passed day variable instead of the hardcoded 'monday'
    if (!currentMealPlan[day]) {
        currentMealPlan[day] = [];
    }
    
    const newMeal = {
        id: Date.now(),
        recipeId: recipeId,
        title: recipeTitle,
        notes: '',
        addedDate: new Date().toISOString()
    };
    
    currentMealPlan[day].push(newMeal);
    saveMealPlan();
}

function renderMealPlan() {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const mealPlanContainer = document.getElementById('mealPlanContainer');
    
    mealPlanContainer.innerHTML = days.map(day => {
        const dayMeals = currentMealPlan[day] || [];
        return `
            <div class="day-column">
                <div class="day-header">${day.charAt(0).toUpperCase() + day.slice(1)}</div>
                <div class="meal-list">
                    ${dayMeals.length === 0 ? 
                        `<div class="empty-state">
                            <div>📝</div>
                            <p>No meals planned</p>
                        </div>` : 
                        dayMeals.map(meal => `
                            <div class="meal-item">
                                <div class="meal-title">${meal.title}</div>
                                ${meal.notes ? `<div class="meal-notes">${meal.notes}</div>` : ''}
                                <div class="meal-actions">
                                    <button class="btn btn-sm btn-edit" onclick="openEditModal(${meal.id})">
                                        Edit
                                    </button>
                                    <button class="btn btn-sm btn-delete" onclick="deleteMeal(${meal.id})">
                                        Delete
                                    </button>
                                </div>
                            </div>
                        `).join('')
                    }
                </div>
            </div>
        `;
    }).join('');
}

function openEditModal(mealId) {
    const meal = findMealById(mealId);
    if (!meal) return;

    window.mealBeingEdited = meal;
    document.getElementById('editNotes').value = meal.notes || '';
    const currentDay = findMealDay(mealId);
    document.getElementById('editDay').value = currentDay || 'monday';
    document.getElementById('editModal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('editModal').classList.add('hidden');
    window.mealBeingEdited = null;
}

function saveMealEdit() {
    if (!window.mealBeingEdited) return;

    const newDay = document.getElementById('editDay').value;
    const newNotes = document.getElementById('editNotes').value.trim();
    const oldDay = findMealDay(window.mealBeingEdited.id);
    
    if (oldDay && oldDay !== newDay) {
        currentMealPlan[oldDay] = currentMealPlan[oldDay].filter(m => m.id !== window.mealBeingEdited.id);
    }

    if (!currentMealPlan[newDay]) currentMealPlan[newDay] = [];
    const existingIndex = currentMealPlan[newDay].findIndex(m => m.id === window.mealBeingEdited.id);
    
    if (existingIndex > -1) {
        currentMealPlan[newDay][existingIndex].notes = newNotes;
    } else {
        currentMealPlan[newDay].push({ 
            ...window.mealBeingEdited, 
            notes: newNotes
        });
    }

    saveMealPlan();
    renderMealPlan();
    closeModal();
    showToast('Meal plan updated successfully!');
}

function deleteMeal(mealId) {
    const meal = findMealById(mealId);
    if (!meal) return;

    if (confirm(`Are you sure you want to remove "${meal.title}" from your meal plan?`)) {
        for (const day in currentMealPlan) {
            currentMealPlan[day] = currentMealPlan[day].filter(meal => meal.id !== mealId);
        }
        saveMealPlan();
        renderMealPlan();
        showToast('Meal removed from plan');
    }
}

function clearMealPlan() {
    if (Object.keys(currentMealPlan).length === 0) {
        showToast('Meal plan is already empty', 'warning');
        return;
    }

    if (confirm('Are you sure you want to clear your entire meal plan? This action cannot be undone.')) {
        currentMealPlan = {};
        saveMealPlan();
        renderMealPlan();
        showToast('Meal plan cleared successfully');
    }
}

// Export Functions
function exportMealPlan() {
    const mealPlanText = generateMealPlanText();
    const blob = new Blob([mealPlanText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sunnah-meal-plan.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Meal plan exported!');
}

function generateMealPlanText() {
    let text = '🌿 Sunnah Meal Plan\n';
    text += '====================\n\n';
    
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    days.forEach(day => {
        const meals = currentMealPlan[day] || [];
        text += `${day.toUpperCase()}\n`;
        text += '─'.repeat(day.length) + '\n';
        
        if (meals.length === 0) {
            text += 'No meals planned\n';
        } else {
            meals.forEach((meal, index) => {
                text += `${index + 1}. ${meal.title}\n`;
                if (meal.notes) {
                    text += `   Notes: ${meal.notes}\n`;
                }
            });
        }
        text += '\n';
    });
    
    return text;
}

// Helper Functions (Your existing helpers)
function findMealById(mealId) {
    for (const day in currentMealPlan) {
        const meal = currentMealPlan[day].find(m => m.id === mealId);
        if (meal) return meal;
    }
    return null;
}

function findMealDay(mealId) {
    for (const day in currentMealPlan) {
        if (currentMealPlan[day].find(m => m.id === mealId)) {
            return day;
        }
    }
    return null;
}

function saveMealPlan() {
    localStorage.setItem('sunnahMealPlan', JSON.stringify(currentMealPlan));
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// Initialize the application
document.addEventListener('DOMContentLoaded', init);