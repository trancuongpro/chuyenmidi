document.addEventListener('DOMContentLoaded', function() {
    // Khởi tạo Verovio Toolkit
    const vrvToolkit = new verovio.toolkit();
    const notationViewer = document.getElementById('notationViewer');
    const xmlFileInput = document.getElementById('xmlFile');
    const fileNameDisplay = document.getElementById('fileName');
    const convertBtn = document.getElementById('convertBtn');
    const sheetMusicContainer = document.getElementById('sheetMusicContainer');
    const statusMessage = document.getElementById('statusMessage');
    
    // Cấu hình Verovio chỉ với các tùy chọn được hỗ trợ
    const options = {
        scale: 50,
        pageWidth: 1200,
        pageHeight: 1684,
        spacingStaff: 1.5,
        adjustPageHeight: 1,      // Sử dụng số thay vì boolean
        footer: 'none',         // Ẩn footer
        header: 'none',         // Ẩn header
        breaks: 'auto'          // Tự động ngắt trang
    };
    
    try {
        vrvToolkit.setOptions(options);
    } catch (e) {
        console.warn('Một số tùy chọn không được hỗ trợ:', e);
        // Sử dụng các tùy chọn tối thiểu nếu có lỗi
        vrvToolkit.setOptions({
            scale: 50,
            pageWidth: 1200,
            spacingStaff: 1.5
        });
    }
    
    // Xử lý khi chọn file
    xmlFileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        fileNameDisplay.textContent = file.name;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const xmlContent = e.target.result;
                
                // Tải dữ liệu MusicXML
                if (!vrvToolkit.loadData(xmlContent)) {
                    throw new Error('File MusicXML không hợp lệ');
                }
                
                // Hiển thị bản nhạc (chỉ trang đầu tiên)
                notationViewer.innerHTML = vrvToolkit.renderToSVG(1);
                
                // Hiển thị giao diện chuyển đổi
                sheetMusicContainer.classList.remove('hidden');
                convertBtn.disabled = false;
                statusMessage.classList.add('hidden');
                
            } catch (error) {
                showStatus('Không thể đọc file. Vui lòng kiểm tra lại định dạng.', 'error');
                console.error('Lỗi xử lý MusicXML:', error);
            }
        };
        reader.onerror = () => showStatus('Lỗi khi đọc file', 'error');
        reader.readAsText(file);
    });
    
    // Xử lý chuyển đổi sang MIDI
    convertBtn.addEventListener('click', async function() {
        if (!xmlFileInput.files[0]) return;
        
        try {
            // Hiệu ứng loading
            convertBtn.disabled = true;
            convertBtn.classList.add('loading');
            
            // Đọc lại file để đảm bảo dữ liệu mới nhất
            const file = xmlFileInput.files[0];
            const xmlContent = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.onerror = e => reject(new Error('Lỗi đọc file'));
                reader.readAsText(file);
            });
            
            // Tải dữ liệu vào Verovio
            if (!vrvToolkit.loadData(xmlContent)) {
                throw new Error('Dữ liệu MusicXML không hợp lệ');
            }
            
            // Chuyển đổi sang MIDI
            const midiOutput = vrvToolkit.renderToMIDI();
            const midiBase64 = midiOutput.startsWith('data:') 
                ? midiOutput.split(',')[1] 
                : midiOutput;
            
            // Tạo và tải xuống file MIDI
            const byteString = atob(midiBase64);
            const byteArray = new Uint8Array(byteString.length);
            for (let i = 0; i < byteString.length; i++) {
                byteArray[i] = byteString.charCodeAt(i);
            }
            
            const blob = new Blob([byteArray], {type: 'audio/midi'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${file.name.replace(/\.[^/.]+$/, '')}.mid`;
            document.body.appendChild(a);
            a.click();
            
            // Dọn dẹp
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showStatus('Chuyển Đổi Thành Công !... Chọn Nơi Lưu File.', 'success');
            }, 100);
            
        } catch (error) {
            console.error('Lỗi chuyển đổi:', error);
            showStatus(`Lỗi: ${error.message}`, 'error');
        } finally {
            convertBtn.disabled = false;
            convertBtn.classList.remove('loading');
        }
    });
    
    // Hiển thị thông báo
    function showStatus(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
        statusMessage.classList.remove('hidden');
    }
    
    // Kiểm tra Verovio
    if (typeof verovio === 'undefined') {
        showStatus('Lỗi: Thư viện Verovio chưa được tải', 'error');
        convertBtn.disabled = true;
    }
});