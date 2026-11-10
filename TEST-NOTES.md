# 0.5.0 doğrulama notları

10 Kasım 2026 tarihinde kontrol edildi:

- Normalizasyon, Unicode kelime sınırları, CSV ayrıştırma, ifade sınırları ve aktif gün serisi.
- Tekrar eklememe, eşzamanlı kayıt kuyruğu ve ilk öğrenme tarihinin korunması.
- Tam kayıtla silme/geri alma; sonradan düzenlenen kayıtların korunması.
- Not düzenleme, bozuk içe aktarma satırları, güvenli kaynak URL'si, ayar doğrulama ve süre sınırı.
- Ayrı Chrome test oturumunda 420px panel genişliği; toplu ekleme, gerçek arka plan koduyla not düzenleme ve 30 günlük grafik.
- CSS Custom Highlight API ile gerçek metin rengi kuralları; alt çizgi ve metni saran yeni DOM elemanları olmaması.
- Inline öğeler arasında kayıtlı ifade, karma dil/kod/görsel zemin dışlama, dinamik içerik ve renklendirmeyi kapatma.
- 0.5.0 için `node --test tests/phrases.test.js` (9 test): `give up`, çekimli/ayrık öbekler, kelime sınırları, kayıtlı öbeği atlama, cümle seçimi, düzensiz/ikilenen fiil biçimleri, öbeklerin tek öğe olarak çıkarılması, ayrık kayıtlı öbek vurgusu, kalıp ifadeler ve paneldeki öbek bölme.
- JavaScript sözdizimi, manifest JSON ve `git diff --check` kontrolü.

Chrome storage/runtime/sidePanel/i18n çağrıları önceki tarayıcı testinde taklit edildi; kelime yönetiminde gerçek background.js çalıştırıldı. Kurulu Chrome 157'de Anadolu Ajansı haberindeki kelime seçimi, seçim kartı, cümle çevirisi ve panel geçişi önceki sürümde denendi. Başlık seçimi dil kontrolü yüzünden engelleniyordu; bu sürümde kontrol sırası düzeltildi. 0.4.0–0.5.0 öbek önerisi, öbek çıkarımı, bağlam alanı ve paneldeki **böl** düğmesi kurulu eklentide henüz denenmedi. Gerçek Chrome'da dil paketi indirmesi, yeni kart akışı ve farklı sitelerde uyumluluk yeniden doğrulanmalıdır.
