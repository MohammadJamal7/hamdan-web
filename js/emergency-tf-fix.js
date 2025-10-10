// Emergency fix for true/false buttons
window.emergencyTrueFalseTest = function() {
  console.log('EMERGENCY TEST: Creating true/false question modal');
  
  // Create a completely standalone modal
  const modalId = 'emergencyQuestionModal';
  
  // Remove any existing emergency modal
  const existingModal = document.getElementById(modalId);
  if (existingModal) {
    existingModal.remove();
    console.log('Removed existing emergency modal');
  }
  
  // Create simple modal HTML with direct button implementation
  const modalHTML = `
    <div class="modal" id="${modalId}" tabindex="-1" style="display: block; z-index: 2000;">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">سؤال صح/خطأ</h5>
          </div>
          <div class="modal-body">
            <p class="mb-4">هل هذا سؤال اختبار للتأكد من ظهور الأزرار؟</p>
            <div class="d-flex flex-column gap-3">
              <button type="button" class="btn btn-lg btn-outline-danger" onclick="this.classList.add('btn-danger'); this.classList.remove('btn-outline-danger');" style="font-size: 18px;">خطأ</button>
              <button type="button" class="btn btn-lg btn-outline-success" onclick="this.classList.add('btn-success'); this.classList.remove('btn-outline-success');" style="font-size: 18px;">صحيح</button>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary" onclick="document.getElementById('${modalId}').remove();">إغلاق</button>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-backdrop fade show" style="z-index: 1900;"></div>
  `;
  
  // Add modal to body
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Force visibility with inline styles
  const modalElement = document.getElementById(modalId);
  modalElement.style.display = 'block';
  
  console.log('EMERGENCY TEST: Modal created and should be visible');
  return "Emergency true/false test modal created. You should see the buttons now.";
};

// Create a super simple direct HTML test
window.superSimpleTFTest = function() {
  // Create a div with buttons directly in the page
  const testDiv = document.createElement('div');
  testDiv.id = 'superSimpleTFTest';
  testDiv.style.position = 'fixed';
  testDiv.style.top = '50%';
  testDiv.style.left = '50%';
  testDiv.style.transform = 'translate(-50%, -50%)';
  testDiv.style.backgroundColor = 'white';
  testDiv.style.padding = '20px';
  testDiv.style.borderRadius = '10px';
  testDiv.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
  testDiv.style.zIndex = '9999';
  testDiv.style.width = '80%';
  testDiv.style.maxWidth = '400px';
  
  testDiv.innerHTML = `
    <h3 style="text-align: center; margin-bottom: 20px;">اختبار أزرار صح/خطأ</h3>
    <div style="display: flex; flex-direction: column; gap: 10px;">
      <button style="padding: 15px; font-size: 18px; background-color: #f8d7da; border: 1px solid #f5c2c7; color: #842029; border-radius: 5px;">خطأ</button>
      <button style="padding: 15px; font-size: 18px; background-color: #d1e7dd; border: 1px solid #badbcc; color: #0f5132; border-radius: 5px;">صحيح</button>
    </div>
    <div style="text-align: center; margin-top: 20px;">
      <button onclick="document.getElementById('superSimpleTFTest').remove();" style="padding: 10px 20px; background-color: #0d6efd; color: white; border: none; border-radius: 5px;">إغلاق</button>
    </div>
  `;
  
  document.body.appendChild(testDiv);
  return "Super simple test created. You should see buttons directly on the page.";
};
