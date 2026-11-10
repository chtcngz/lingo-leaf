# 0.6.0 doğrulama notları

10 Kasım 2026 tarihinde kontrol edildi:

- Normalizasyon, Unicode kelime sınırları, CSV ayrıştırma, ifade sınırları ve aktif gün serisi.
- Tekrar eklememe, eşzamanlı kayıt kuyruğu ve ilk öğrenme tarihinin korunması.
- Tam kayıtla silme/geri alma; sonradan düzenlenen kayıtların korunması.
- Not düzenleme, bozuk içe aktarma satırları, güvenli kaynak URL'si, ayar doğrulama ve süre sınırı.
- Ayrı Chrome test oturumunda 420px panel genişliği; toplu ekleme, gerçek arka plan koduyla not düzenleme ve 30 günlük grafik.
- CSS Custom Highlight API ile gerçek metin rengi kuralları; alt çizgi ve metni saran yeni DOM elemanları olmaması.
- Inline öğeler arasında kayıtlı ifade, karma dil/kod/görsel zemin dışlama, dinamik içerik ve renklendirmeyi kapatma.
- `node --test tests/*.test.js` (14 test). `tests/colors.test.js`: tüm zemin/seviye/durum bileşimlerinde en az 4.5:1 karşıtlık, durumların ayırt edilebilir ve gri olmayan tonları, büyük/ince yazı hedefleri, zemin vurgusu. `tests/phrases.test.js`: `give up`, çekimli/ayrık öbekler, kelime sınırları, kayıtlı öbeği atlama, cümle seçimi, düzensiz/ikilenen fiil biçimleri, öbeklerin tek öğe olarak çıkarılması, ayrık kayıtlı öbek vurgusu, kalıp ifadeler, paneldeki öbek bölme ve seçilen ayrık öbeğin tek öğe sayılması.
- 0.5.1 için yerleşik tarayıcıda AA haberi (Netanyahu/Eisenkot): kod sayfaya Chrome API taklitleriyle enjekte edildi; dil algılayıcı 200 karakterden kısa metinlerde "emin değil" dönecek şekilde taklit edildi. Düzeltmeden önce H1 ve dört H3 başlığı renklenmiyordu; sonra tüm İngilizce başlıklar renklendi, Türkçe "Anadolu Ajansı" satırı dışlandı. `ruling anyone out` seçimi `rule out` olarak kaydedildi; aynı cümledeki `ruling … out` ve `rule … out` birlikte renklendi. Çeviri API'si bu tarayıcıda yanıt vermediği için çeviri metni doğrulanmadı.
- 0.6.0 için yerleşik tarayıcıda taklit API'lerle panel (440px): kelime grupları, Biliyorum grubunun kapalı durması, kaydetmeden sonra seçimin temizlenmesi ve ikinci kaydın yalnızca yeni seçimi değiştirmesi; ayarlardaki açık/koyu renk önizlemesi. Örnek makale sayfasında beyaz, krem ve koyu zeminde Hafif ve Normal seviyelerin renkleri ve 40px başlığın daha açık tonu ekran görüntüsüyle kontrol edildi.
- JavaScript sözdizimi, manifest JSON ve `git diff --check` kontrolü.

Chrome storage/runtime/sidePanel/i18n çağrıları önceki tarayıcı testinde taklit edildi; kelime yönetiminde gerçek background.js çalıştırıldı. Kurulu Chrome 157'de Anadolu Ajansı haberindeki kelime seçimi, seçim kartı, cümle çevirisi ve panel geçişi önceki sürümde denendi. Başlık seçimi dil kontrolü yüzünden engelleniyordu; bu sürümde kontrol sırası düzeltildi. 0.4.0–0.5.0 öbek önerisi, öbek çıkarımı, bağlam alanı ve paneldeki **böl** düğmesi kurulu eklentide henüz denenmedi. Gerçek Chrome'da dil paketi indirmesi, yeni kart akışı ve farklı sitelerde uyumluluk yeniden doğrulanmalıdır.
