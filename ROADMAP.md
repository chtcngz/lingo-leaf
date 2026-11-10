# LingoLeaf — Yol haritası

Güncelleme: 10 Kasım 2026 · Sürüm: 0.5.1

## Kapsam

İngilizce web metinlerinde kelime ve ifadeleri durumlarına göre renklendirmek; bildiklerini, öğrenmekte olduklarını ve sonradan öğrendiklerini ayrı yönetmek. Seçilen metnin Türkçe çevirisi seçim kartında Chrome'un yerel Translator API'si ile gösterilir.

## Tamamlanan temel istekler

- [x] Bilinmeyen, öğreniyorum, öğrendim ve biliyorum durumları.
- [x] Öğrendim ve biliyorum için ayrı kütüphane filtreleri ve toplamlar.
- [x] Büyük/küçük harf, kenar noktalama ve kesme işareti normalizasyonu; tekrar eklememe.
- [x] Metin seçimiyle tek kelime durum değiştirme; çoklu seçimde benzersiz kelimelerden seçerek toplu ekleme.
- [x] Sağ tık menüsü, değiştirilebilir Alt+Shift+L kısayolu ve yan panel.
- [x] Doğrudan metin rengini değiştirme; alt çizgi yok.
- [x] Açık/koyu düz zeminlerde kontrastı gözeten renkler; hafif/normal/belirgin ayarı ve kişisel renk seçimi.
- [x] Biliyorum durumunda özgün yazı rengini koruma.
- [x] İngilizceyi otomatik algılama; dil etiketleri ve paragraf bazında ek dil kontrolü; site bazında elle düzeltme/duraklatma.
- [x] Yazılabilir alanları, formları, kodları ve açıkça farklı dilde işaretli bölümleri dışlama.
- [x] Dinamik içerikte yeniden tarama; büyük sayfalar için sınır.
- [x] Modern açık/koyu/sistem teması, yan panel ve tam ekran yönetim görünümü.
- [x] Arama, durum filtreleme, sıralama, toplu durum değiştirme ve kaldırma.
- [x] Günlük hedef, ilk öğrenme geçmişi, 7/30/90 günlük grafikler, aktif gün serisi ve yaklaşık aktif okuma süresi.
- [x] Yerel kalıcı kayıt, JSON yedekleme ve tekrarsız birleştirme.

## 0.2.0'da tamamlanan geliştirmeler

- [x] Çeviri alanını bağımsız Kelime ekle alanına dönüştürme.
- [x] Kayıtlı çok kelimeli ifadelerin aynı bloktaki inline öğeler arasında da eşleşmesi; en uzun eşleşmeye öncelik.
- [x] Kelime ayrıntısı: kişisel not, düzenlenebilir örnek, kaynak bağlantısı ve ilk öğrenme tarihi.
- [x] Unuttum işlemi: kelimeyi öğreniyorum durumuna geri taşıma.
- [x] Tam kayıtla geri alma; notu, örneği, kaynağı ve tarihleri koruma; sonradan değiştirilmiş kaydı ezmeme.
- [x] CSV ve TXT ile başlangıç kelime listesi yükleme, CSV dışa aktarma.
- [x] Görsel/degradeli zeminlerde okunabilirliği riske atmamak için özgün metin rengini koruma.
- [x] Ayar ve içe aktarma verilerini doğrulama; eşzamanlı değişiklikleri sırayla yazma.
- [x] Önceki sürüm kayıtlarını dönüştürme gerektirmeden okuyabilme.

## Doğrulama

- [x] JavaScript sözdizimi, manifest ve ZIP dosya bütünlüğü.
- [x] Normalizasyon, CSV, ifade sınırları, durum geçişleri, öğrenme tarihi ve eşzamanlı kayıt kontrolleri.
- [x] Tam kayıtla silme/geri alma ve sonradan değişen kayıtları koruma.
- [x] Ayrı Chrome test oturumunda dar panel, toplu ekleme, gerçek arka plan koduyla not düzenleme ve dönem grafiği.
- [x] Gerçek CSS Highlight API ile metin rengi, DOM yapısını koruma, inline ifade, dinamik içerik, dışlanan alanlar ve kapatma testleri.
- [ ] Kullanıcının Chrome profilinde gerçek eklenti yüklemesi, yan panel kullanıcı hareketi ve kısayol denemesi.
- [ ] Farklı gerçek sitelerde kapsamlı uyumluluk denemesi.

## 0.3.0 seçim çevirisi

- [x] Seçim kartı açıldığında İngilizce–Türkçe çeviriyi otomatik başlatma.
- [x] Dil paketi indirme durumu, tekrar deneme ve uzun çeviriler için kaydırılabilir kart.
- [ ] Chrome 138+ yüklü gerçek eklentide ilk dil paketi indirmesi ve çeviri doğrulaması.

## 0.4.0 bağlam ve öbek önerileri

- [x] Tek kelime seçiminde çevre cümlenin çevirisini ayrı gösterme.
- [x] Yerel WordNet adaylarından fiil öbeklerini çekimli ve ayrık biçimlerde önerme.
- [x] Öbeği kullanıcı onayıyla öğreniyorum listesine ekleme.
- [x] Tekrarlanan seçimler için sayfa belleğinde çeviri önbelleği.

## 0.5.0 öbek çıkarımı

- [x] Seçimde, panelde ve sağ tık menüsünde öbekleri temel biçimiyle tek öğe olarak çıkarma.
- [x] Düzensiz fiiller ve ünsüz ikilenmesi (`broke down`, `dropped off`).
- [x] Kayıtlı öbekleri ayrık biçimde de renklendirme (`gave it up`).
- [x] `in spite of`, `as well as` gibi kalıp ifadeler.
- [x] Paneldeki yanlış öbek adayını kelimelere bölme.
- [ ] Gerçek Chrome eklentisinde öbek kartı ve panel akışının doğrulanması.

## 0.5.1 düzeltmeler

- [x] Dil algılayıcının emin olmadığı başlıklar sayfa diline göre renklendirilir (özel adlarla dolu haber başlıkları).
- [x] Arası açık öbeğin tamamı seçildiğinde (`ruling anyone out`) kart onu tek öbek (`rule out`) olarak gösterir.

## Sonraki çeviri geliştirmeleri

- [ ] Kelime için bağlama uygun sözlük anlamı ve cümle çevirisi ayrımı.
- [ ] Bağlama göre anlam, telaffuz ve açıklamalar.

## İsteğe bağlı sonraki özellikler

Bunlar temel isteklerin dışında kalan genişletmelerdir:

- [ ] Aralıklı tekrar ve kartlar.
- [ ] Daha geniş deyim ve isim öbekleri; ayrık yapılarda daha güvenilir dil çözümleme.
- [ ] İsteğe bağlı cihazlar arası eşitleme ve hesap.
- [ ] Görsel/degradeli zeminleri analiz edip güvenle renklendirme.

## Sınırlar

Chrome iç sayfaları, Web Store, PDF görüntüleyici, çerçeve içleri ve kapalı Shadow DOM kapsam dışı. Dil algılama özellikle çok kısa ve karma metinde yanılabilir; site modu ile düzeltilebilir. Dev sayfalarda tarama kısmi olabilir. İfadeler paragraf sınırları üzerinden eşleştirilmez. Çekimler ayrı kayıttır. Okuma süresi yaklaşık aktif sekme süresidir; gözle okuma ölçümü değildir. Grafikler ilk öğrenme kayıtlarından türetilir; tekrar öğrendim işaretlemek toplamı şişirmez. JSON/CSV/TXT içe aktarma yalnızca kelimeleri birleştirir; ayarları ve okuma sürelerini geri yüklemez.
