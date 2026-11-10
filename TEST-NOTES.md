# 0.3.0 doğrulama notları

10 Kasım 2026 tarihinde kontrol edildi:

- Normalizasyon, Unicode kelime sınırları, CSV ayrıştırma, ifade sınırları ve aktif gün serisi.
- Tekrar eklememe, eşzamanlı kayıt kuyruğu ve ilk öğrenme tarihinin korunması.
- Tam kayıtla silme/geri alma; sonradan düzenlenen kayıtların korunması.
- Not düzenleme, bozuk içe aktarma satırları, güvenli kaynak URL'si, ayar doğrulama ve süre sınırı.
- Ayrı Chrome test oturumunda 420px panel genişliği; toplu ekleme, gerçek arka plan koduyla not düzenleme ve 30 günlük grafik.
- CSS Custom Highlight API ile gerçek metin rengi kuralları; alt çizgi ve metni saran yeni DOM elemanları olmaması.
- Inline öğeler arasında kayıtlı ifade, karma dil/kod/görsel zemin dışlama, dinamik içerik ve renklendirmeyi kapatma.
- 0.3.0 değişikliklerinden sonra JavaScript sözdizimi, manifest JSON ve `git diff --check` kontrolü.

Chrome storage/runtime/sidePanel/i18n çağrıları önceki tarayıcı testinde taklit edildi; kelime yönetiminde gerçek background.js çalıştırıldı. 0.3.0 için seçim kartına yerel Translator API akışı eklendi. Kurulu Chrome 157'de sayfa bağlamında Translator API görüldü. Chrome'un standart sürümü komut satırından paketlenmemiş eklenti yüklemeyi desteklemediği için gerçek eklenti bağlamında dil paketi indirmesi ve çeviri sonucu henüz doğrulanmadı. Kullanıcı hareketiyle yan panel açılması ve farklı sitelerde uyumluluk denemesi de yapılmalıdır.
