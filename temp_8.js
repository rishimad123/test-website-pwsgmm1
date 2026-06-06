// --- MY PROFILE (VOLUNTEER) ---
function loadMyProfileVol() {
    const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    document.getElementById('profVolName').value = user.name || '';
    document.getElementById('profVolEmail').value = user.email || user.username || '';
    document.getElementById('profVolContact').value = user.contactNumber || '';
    
    if (user.photoUrl) {
        document.getElementById('profVolPhotoPreview').src = user.photoUrl;
        document.getElementById('profVolPhotoPreview').style.display = 'block';
    } else {
        document.getElementById('profVolPhotoPreview').style.display = 'none';
    }
}

function previewVolProfileImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('profVolPhotoPreview').src = e.target.result;
            document.getElementById('profVolPhotoPreview').style.display = 'block';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

async function saveVolProfile(e) {
    e.preventDefault();
    const btn = document.getElementById('profVolBtn');
    btn.disabled = true;
    btn.innerHTML = 'Saving...';
    
    const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    const payload = {
        username: user.username,
        name: document.getElementById('profVolName').value.trim(),
        contactNumber: document.getElementById('profVolContact').value.trim()
    };
    
    const photoFile = document.getElementById('profVolPhoto').files[0];
    if (photoFile) {
        const reader = new FileReader();
        payload.photoBase64 = await new Promise((res) => {
            reader.onload = () => res(reader.result.split(',')[1]);
            reader.readAsDataURL(photoFile);
        });
        payload.photoExt = photoFile.name.split('.').pop();
    }
    
    try {
        const res = await fetch('/api/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
            user.name = data.user.name;
            user.contactNumber = data.user.contactNumber || '';
            if (data.user.photoUrl) user.photoUrl = data.user.photoUrl;
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            
            document.getElementById('userName').textContent = 'Welcome ' + user.name;
            document.getElementById('topBarName').textContent = user.name;
            const avatarEl = document.getElementById('userAvatar');
            if (user.photoUrl) {
                avatarEl.innerHTML = '<img src="' + user.photoUrl + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
                avatarEl.style.padding = '0';
                avatarEl.style.overflow = 'hidden';
            } else {
                avatarEl.innerHTML = '';
                avatarEl.textContent = user.name.charAt(0);
                avatarEl.style.padding = '';
            }
            alert('Profile updated successfully!');
        } else {
            alert('Error updating profile: ' + (data.message || 'Unknown error'));
        }
    } catch (err) {
        alert('Server unreachable');
    }
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> Update Profile';
}

// Hook into showSection
const originalShowSection = window.showSection;
if (originalShowSection) {
    window.showSection = function(id) {
        if (id === 'profile') {
            loadMyProfileVol();
        }
        originalShowSection(id);
    };
}