import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// التصنيفات الرسمية للمتاجر — 10 تصنيفات مع حقول ديناميكية لكل فئة
const storeCategories = [
  {
    id: 'cat_electronics',
    name: 'Electronics',
    nameAr: 'الإلكترونيات',
    slug: 'electronics',
    description: 'Electronic devices, phones, laptops, and gadgets',
    descriptionAr: 'الهواتف والحواسيب والأجهزة الإلكترونية',
    icon: 'Smartphone',
    color: '#3B82F6',
    order: 1,
    isActive: true,
    templateFields: {
      hasVariants: true,
      variantAttributes: [
        { key: 'storage', label: 'Storage', labelAr: 'السعة التخزينية', options: ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB'] },
        { key: 'color', label: 'Color', labelAr: 'اللون', options: ['أسود', 'أبيض', 'رمادي', 'ذهبي', 'أزرق', 'أحمر', 'أخضر', 'بنفسجي'] },
        { key: 'ram', label: 'RAM', labelAr: 'الذاكرة العشوائية', options: ['4GB', '6GB', '8GB', '12GB', '16GB', '32GB', '64GB'] },
      ],
      productAttributes: [
        { key: 'brand', label: 'Brand', labelAr: 'العلامة التجارية', type: 'text', required: true },
        { key: 'condition', label: 'Condition', labelAr: 'الحالة', type: 'select', options: ['جديد', 'مستعمل - ممتاز', 'مستعمل - جيد', 'مُجدَّد'], required: true },
        { key: 'warranty', label: 'Warranty', labelAr: 'الضمان', type: 'select', options: ['بدون ضمان', '3 أشهر', '6 أشهر', 'سنة', 'سنتين'], required: true },
        { key: 'model', label: 'Model', labelAr: 'الموديل', type: 'text', required: false },
      ],
    },
  },
  {
    id: 'cat_fashion',
    name: 'Fashion & Clothing',
    nameAr: 'الأزياء والموضة',
    slug: 'fashion',
    description: 'Clothing, shoes, bags, and accessories',
    descriptionAr: 'الملابس والأحذية والحقائب والإكسسوارات',
    icon: 'Shirt',
    color: '#EC4899',
    order: 2,
    isActive: true,
    templateFields: {
      hasVariants: true,
      variantAttributes: [
        { key: 'size', label: 'Size', labelAr: 'المقاس', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'] },
        { key: 'color', label: 'Color', labelAr: 'اللون', options: ['أسود', 'أبيض', 'أزرق', 'أحمر', 'أخضر', 'بيج', 'رمادي', 'بني', 'وردي', 'برتقالي', 'أصفر', 'كحلي'] },
      ],
      productAttributes: [
        { key: 'material', label: 'Material', labelAr: 'نوع القماش', type: 'select', options: ['قطن', 'بوليستر', 'حرير', 'صوف', 'جينز', 'كتان', 'جلد طبيعي', 'جلد صناعي', 'شيفون', 'ساتان'], required: true },
        { key: 'gender', label: 'Gender', labelAr: 'الفئة', type: 'select', options: ['رجالي', 'نسائي', 'للجنسين'], required: true },
        { key: 'season', label: 'Season', labelAr: 'الموسم', type: 'select', options: ['صيفي', 'شتوي', 'ربيعي/خريفي', 'كل المواسم'], required: false },
        { key: 'brand', label: 'Brand', labelAr: 'العلامة التجارية', type: 'text', required: false },
      ],
    },
  },
  {
    id: 'cat_food',
    name: 'Food & Beverages',
    nameAr: 'الطعام والمشروبات',
    slug: 'food-beverages',
    description: 'Food products, restaurants, cafes, and beverages',
    descriptionAr: 'المنتجات الغذائية والمطاعم والمقاهي والمشروبات',
    icon: 'UtensilsCrossed',
    color: '#F59E0B',
    order: 3,
    isActive: true,
    templateFields: {
      hasVariants: false,
      productAttributes: [
        { key: 'expiryDate', label: 'Expiry Date', labelAr: 'تاريخ الانتهاء', type: 'date', required: true },
        { key: 'ingredients', label: 'Ingredients', labelAr: 'المكونات', type: 'textarea', required: true },
        { key: 'weight', label: 'Weight/Volume', labelAr: 'الوزن/الحجم', type: 'text', placeholder: 'مثال: 500غ أو 1لتر', required: true },
        { key: 'storageMethod', label: 'Storage Method', labelAr: 'طريقة التخزين', type: 'select', options: ['درجة حرارة الغرفة', 'مبرد', 'مجمد'], required: true },
        { key: 'calories', label: 'Calories', labelAr: 'السعرات الحرارية', type: 'number', required: false },
        { key: 'allergens', label: 'Allergens', labelAr: 'مسببات الحساسية', type: 'multiselect', options: ['جلوتين', 'لاكتوز', 'مكسرات', 'بيض', 'صويا', 'سمك', 'قمح'], required: false },
        { key: 'isOrganic', label: 'Organic', labelAr: 'عضوي', type: 'boolean', required: false },
      ],
    },
  },
  {
    id: 'cat_beauty',
    name: 'Beauty & Care',
    nameAr: 'الجمال والعناية',
    slug: 'beauty-care',
    description: 'Cosmetics, skincare, perfumes, and personal care',
    descriptionAr: 'مستحضرات التجميل والعناية بالبشرة والعطور',
    icon: 'Sparkles',
    color: '#8B5CF6',
    order: 4,
    isActive: true,
    templateFields: {
      hasVariants: true,
      variantAttributes: [
        { key: 'shade', label: 'Shade', labelAr: 'الدرجة', options: ['فاتح', 'متوسط', 'داكن', 'عاجي', 'برونزي', 'وردي', 'محايد'] },
        { key: 'size', label: 'Size', labelAr: 'الحجم', options: ['15ml', '30ml', '50ml', '75ml', '100ml', '150ml', '200ml', '250ml'] },
      ],
      productAttributes: [
        { key: 'skinType', label: 'Skin Type', labelAr: 'نوع البشرة', type: 'select', options: ['جافة', 'دهنية', 'مختلطة', 'حساسة', 'عادية', 'الكل'], required: true },
        { key: 'brand', label: 'Brand', labelAr: 'العلامة التجارية', type: 'text', required: true },
        { key: 'expiryDate', label: 'Expiry Date', labelAr: 'تاريخ الانتهاء', type: 'date', required: true },
        { key: 'ingredients', label: 'Main Ingredients', labelAr: 'المكونات الرئيسية', type: 'textarea', required: false },
        { key: 'certification', label: 'Certification', labelAr: 'الشهادات', type: 'multiselect', options: ['عضوي', 'نباتي', 'خالي من القسوة', 'حلال', 'خالي من البارابين', 'خالي من الكحول'], required: false },
      ],
    },
  },
  {
    id: 'cat_home',
    name: 'Home & Furniture',
    nameAr: 'المنزل والأثاث',
    slug: 'home-furniture',
    description: 'Furniture, home decor, appliances, and garden',
    descriptionAr: 'الأثاث والديكور والأجهزة المنزلية ومستلزمات الحديقة',
    icon: 'Sofa',
    color: '#10B981',
    order: 5,
    isActive: true,
    templateFields: {
      hasVariants: true,
      variantAttributes: [
        { key: 'color', label: 'Color', labelAr: 'اللون', options: ['أبيض', 'أسود', 'بني', 'رمادي', 'بيج', 'كريمي', 'خشبي طبيعي'] },
        { key: 'size', label: 'Size', labelAr: 'الحجم', options: ['صغير', 'متوسط', 'كبير', 'مزدوج'] },
      ],
      productAttributes: [
        { key: 'material', label: 'Material', labelAr: 'الخامة', type: 'select', options: ['خشب طبيعي', 'MDF', 'معدن', 'زجاج', 'بلاستيك', 'قماش', 'جلد', 'رخام'], required: true },
        { key: 'dimensions', label: 'Dimensions', labelAr: 'الأبعاد (سم)', type: 'text', placeholder: 'الطول × العرض × الارتفاع', required: true },
        { key: 'weight', label: 'Weight', labelAr: 'الوزن (كغ)', type: 'number', required: false },
        { key: 'assemblyRequired', label: 'Assembly Required', labelAr: 'يحتاج تركيب', type: 'boolean', required: true },
        { key: 'warranty', label: 'Warranty', labelAr: 'الضمان', type: 'select', options: ['بدون ضمان', '6 أشهر', 'سنة', 'سنتين', '5 سنوات'], required: false },
      ],
    },
  },
  {
    id: 'cat_books',
    name: 'Books & Digital Products',
    nameAr: 'الكتب والمنتجات الرقمية',
    slug: 'books-digital',
    description: 'Books, courses, templates, and digital downloads',
    descriptionAr: 'الكتب والدورات والقوالب والمنتجات الرقمية',
    icon: 'BookOpen',
    color: '#6366F1',
    order: 6,
    isActive: true,
    templateFields: {
      hasVariants: false,
      productAttributes: [
        { key: 'productType', label: 'Product Type', labelAr: 'نوع المنتج', type: 'select', options: ['كتاب ورقي', 'كتاب إلكتروني', 'كتاب صوتي', 'دورة تدريبية', 'قالب تصميم', 'برنامج/تطبيق', 'ملفات رقمية'], required: true },
        { key: 'deliveryMethod', label: 'Delivery Method', labelAr: 'طريقة التوصيل', type: 'select', options: ['شحن فقط', 'تحميل رقمي فقط', 'شحن وتحميل رقمي'], required: true },
        { key: 'language', label: 'Language', labelAr: 'اللغة', type: 'select', options: ['العربية', 'الإنجليزية', 'الفرنسية', 'الكردية', 'التركية', 'ثنائي اللغة', 'أخرى'], required: true },
        { key: 'author', label: 'Author/Creator', labelAr: 'المؤلف/المنشئ', type: 'text', required: false },
        { key: 'pages', label: 'Pages/Duration', labelAr: 'عدد الصفحات/المدة', type: 'text', placeholder: 'مثال: 250 صفحة أو 5 ساعات', required: false },
        { key: 'format', label: 'Format', labelAr: 'الصيغة', type: 'select', options: ['PDF', 'EPUB', 'MP3', 'MP4', 'ZIP', 'غلاف ورقي', 'غلاف فاخر'], required: true },
        { key: 'isbn', label: 'ISBN', labelAr: 'الرقم الدولي', type: 'text', required: false },
      ],
    },
  },
  {
    id: 'cat_handmade',
    name: 'Handmade & Crafts',
    nameAr: 'الحرف والمنتجات اليدوية',
    slug: 'handmade',
    description: 'Handmade products, traditional crafts, and artisan goods',
    descriptionAr: 'المنتجات اليدوية والحرف التراثية والمصنوعات المحلية',
    icon: 'Palette',
    color: '#D97706',
    order: 7,
    isActive: true,
    templateFields: {
      hasVariants: true,
      variantAttributes: [
        { key: 'color', label: 'Color', labelAr: 'اللون', options: ['طبيعي', 'أبيض', 'أسود', 'بني', 'أحمر', 'أزرق', 'أخضر', 'متعدد الألوان'] },
        { key: 'size', label: 'Size', labelAr: 'الحجم', options: ['صغير', 'متوسط', 'كبير', 'مخصص حسب الطلب'] },
      ],
      productAttributes: [
        { key: 'craftType', label: 'Craft Type', labelAr: 'نوع الحرفة', type: 'select', options: ['فخار وخزف', 'خياطة وتطريز', 'نجارة', 'رسم وفن', 'حياكة وكروشيه', 'صناعة الشموع', 'صناعة الصابون', 'أعمال الجلود', 'خط عربي', 'أخرى'], required: true },
        { key: 'material', label: 'Material', labelAr: 'الخامة الأساسية', type: 'text', required: true },
        { key: 'productionTime', label: 'Production Time', labelAr: 'مدة التجهيز', type: 'select', options: ['جاهز للشحن', '1-3 أيام', '3-7 أيام', '1-2 أسبوع', '2-4 أسابيع'], required: true },
        { key: 'customizable', label: 'Customizable', labelAr: 'يقبل طلبات مخصصة', type: 'boolean', required: true },
        { key: 'weight', label: 'Weight', labelAr: 'الوزن التقريبي', type: 'text', placeholder: 'مثال: 500غ', required: false },
      ],
    },
  },
  {
    id: 'cat_kids',
    name: 'Kids & Baby',
    nameAr: 'الأطفال والرضع',
    slug: 'kids-baby',
    description: 'Toys, baby products, and children clothing',
    descriptionAr: 'الألعاب ومنتجات الأطفال والرضع وملابسهم',
    icon: 'Baby',
    color: '#F472B6',
    order: 8,
    isActive: true,
    templateFields: {
      hasVariants: true,
      variantAttributes: [
        { key: 'size', label: 'Size', labelAr: 'المقاس', options: ['0-3 شهور', '3-6 شهور', '6-12 شهور', '1-2 سنة', '2-3 سنوات', '3-4 سنوات', '4-6 سنوات', '6-8 سنوات', '8-10 سنوات', '10-12 سنة'] },
        { key: 'color', label: 'Color', labelAr: 'اللون', options: ['وردي', 'أزرق', 'أبيض', 'أصفر', 'أخضر', 'بنفسجي', 'برتقالي', 'متعدد'] },
      ],
      productAttributes: [
        { key: 'ageRange', label: 'Age Range', labelAr: 'الفئة العمرية', type: 'select', options: ['حديثي الولادة (0-3 شهور)', 'رضّع (3-12 شهور)', 'صغار (1-3 سنوات)', 'أطفال (3-6 سنوات)', 'أطفال أكبر (6-12 سنة)'], required: true },
        { key: 'gender', label: 'Gender', labelAr: 'الجنس', type: 'select', options: ['بنات', 'أولاد', 'للجنسين'], required: true },
        { key: 'material', label: 'Material', labelAr: 'الخامة', type: 'select', options: ['قطن عضوي', 'قطن', 'بوليستر', 'بلاستيك آمن', 'خشب طبيعي', 'سيليكون آمن', 'قماش ناعم'], required: true },
        { key: 'safetyStandard', label: 'Safety Standard', labelAr: 'معيار الأمان', type: 'select', options: ['CE معتمد', 'معتمد دولياً', 'خالي من BPA', 'غير سام'], required: false },
      ],
    },
  },
  {
    id: 'cat_jewelry',
    name: 'Jewelry & Watches',
    nameAr: 'المجوهرات والساعات',
    slug: 'jewelry-watches',
    description: 'Gold, silver, jewelry, watches, and luxury accessories',
    descriptionAr: 'الذهب والفضة والمجوهرات والساعات والإكسسوارات الفاخرة',
    icon: 'Gem',
    color: '#EAB308',
    order: 9,
    isActive: true,
    templateFields: {
      hasVariants: true,
      variantAttributes: [
        { key: 'size', label: 'Size', labelAr: 'المقاس', options: ['صغير', 'متوسط', 'كبير', 'قابل للتعديل', 'مقاس 14', 'مقاس 16', 'مقاس 18', 'مقاس 20', 'مقاس 22'] },
        { key: 'color', label: 'Color/Finish', labelAr: 'اللون/التشطيب', options: ['ذهبي', 'فضي', 'روز قولد', 'أسود', 'متعدد'] },
      ],
      productAttributes: [
        { key: 'metalType', label: 'Metal Type', labelAr: 'نوع المعدن', type: 'select', options: ['ذهب عيار 24', 'ذهب عيار 21', 'ذهب عيار 18', 'فضة 925', 'بلاتين', 'ستانلس ستيل', 'نحاس', 'بدون معدن'], required: true },
        { key: 'gemstone', label: 'Gemstone', labelAr: 'الأحجار الكريمة', type: 'select', options: ['بدون', 'ألماس', 'ياقوت', 'زمرد', 'لؤلؤ', 'زركون', 'كريستال', 'أخرى'], required: false },
        { key: 'weight', label: 'Weight (grams)', labelAr: 'الوزن (غرام)', type: 'number', required: true },
        { key: 'condition', label: 'Condition', labelAr: 'الحالة', type: 'select', options: ['جديد', 'مستعمل - ممتاز', 'أنتيك/تراثي'], required: true },
        { key: 'warranty', label: 'Warranty', labelAr: 'الضمان', type: 'select', options: ['بدون ضمان', '6 أشهر', 'سنة', 'سنتين', 'ضمان مدى الحياة'], required: false },
        { key: 'certificate', label: 'Certificate', labelAr: 'شهادة الأصالة', type: 'boolean', required: true },
      ],
    },
  },
  {
    id: 'cat_services',
    name: 'Services',
    nameAr: 'الخدمات',
    slug: 'services',
    description: 'Professional services, consulting, and maintenance',
    descriptionAr: 'الخدمات المهنية والاستشارات والصيانة',
    icon: 'Briefcase',
    color: '#0EA5E9',
    order: 10,
    isActive: true,
    templateFields: {
      hasVariants: false,
      productAttributes: [
        { key: 'serviceType', label: 'Service Type', labelAr: 'نوع الخدمة', type: 'select', options: ['صيانة وإصلاح', 'تركيب', 'استشارة', 'تدريب وتعليم', 'تصميم جرافيك', 'تصميم داخلي', 'برمجة وتطوير', 'تصوير وفيديو', 'ترجمة', 'تنظيف', 'نقل', 'أخرى'], required: true },
        { key: 'duration', label: 'Duration', labelAr: 'المدة المتوقعة', type: 'select', options: ['أقل من ساعة', '1-2 ساعة', '2-4 ساعات', 'نصف يوم', 'يوم كامل', '2-3 أيام', 'أسبوع', 'حسب المشروع'], required: true },
        { key: 'deliveryMethod', label: 'Delivery Method', labelAr: 'طريقة التقديم', type: 'select', options: ['حضوري', 'عن بُعد', 'حضوري وعن بُعد'], required: true },
        { key: 'availability', label: 'Availability', labelAr: 'أيام التوفر', type: 'multiselect', options: ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'], required: false },
        { key: 'coverageArea', label: 'Coverage Area', labelAr: 'نطاق التغطية', type: 'select', options: ['نفس المدينة', 'نفس المحافظة', 'جميع المحافظات', 'أونلاين - بلا حدود'], required: false },
      ],
    },
  },
];

async function main() {
  console.log('🌱 Seeding store categories with templateFields...');

  for (const category of storeCategories) {
    await prisma.store_categories.upsert({
      where: { id: category.id },
      update: {
        name: category.name,
        nameAr: category.nameAr,
        slug: category.slug,
        description: category.description,
        descriptionAr: category.descriptionAr,
        icon: category.icon,
        color: category.color,
        order: category.order,
        isActive: category.isActive,
        templateFields: category.templateFields,
        updatedAt: new Date(),
      },
      create: {
        id: category.id,
        name: category.name,
        nameAr: category.nameAr,
        slug: category.slug,
        description: category.description,
        descriptionAr: category.descriptionAr,
        icon: category.icon,
        color: category.color,
        order: category.order,
        isActive: category.isActive,
        templateFields: category.templateFields,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log(`  ✓ ${category.nameAr} (${category.name})`);
  }

  console.log('\n✅ Seeding completed with dynamic product attributes!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
