/**
 * Функция для расчета выручки
 * @param {Object} purchase запись о покупке
 * @param {Object} _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  // Извлекаем только те поля, которые не будут конфликтовать с именем новой константы
  const { sale_price, quantity } = purchase;
  // Рассчитываем коэффициент скидки
  const discount = 1 - purchase.discount / 100;

  return sale_price * quantity * discount;
}

/**
 * Функция для расчета бонусов
 * @param {number} index порядковый номер в отсортированном массиве
 * @param {number} total общее число продавцов
 * @param {Object} seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
  const { profit } = seller;

  if (index === 0) {
    return (15 / 100) * profit;
  } else if (index === 1 || index === 2) {
    return (10 / 100) * profit;
  } else if (index === total - 1) {
    return 0;
  } else {
    // Для всех остальных
    return (5 / 100) * profit;
  }
}

/**
 * Функция для анализа данных продаж
 * @param {Object} data
 * @param {Object} options
 * @returns {Array}
 */
function analyzeSalesData(data, options) {
  const { calculateRevenue, calculateBonus } = options;

  // @TODO: Проверка входных данных
  if (
    !data ||
    !Array.isArray(data.sellers) ||
    !Array.isArray(data.products) ||
    !Array.isArray(data.purchase_records) ||
    data.sellers.length === 0 ||
    data.products.length === 0 ||
    data.purchase_records.length === 0
  ) {
    throw new Error("Некорректные входные данные");
  }

  // @TODO: Проверка наличия опций
  if (
    !options ||
    typeof calculateRevenue !== "function" ||
    typeof calculateBonus !== "function"
  ) {
    throw new Error("Что-то не определено");
  }

  // @TODO: Подготовка промежуточных данных для сбора статистики
  const sellerStats = data.sellers.map((seller) => ({
    id: seller.id,
    name: `${seller.first_name} ${seller.last_name}`,
    revenue: 0,
    profit: 0,
    sales_count: 0,
    products_sold: {},
  }));

  // @TODO: Индексация продавцов и товаров для быстрого доступа
  const sellerIndex = Object.fromEntries(
    sellerStats.map((seller) => [seller.id, seller]),
  );
  const productIndex = Object.fromEntries(
    data.products.map((product) => [product.sku, product]),
  );

  // @TODO: Расчет выручки и прибыли для каждого продавца
  data.purchase_records.forEach((record) => {
    const seller = sellerIndex[record.seller_id]; // Продавец

    seller.sales_count += 1; // Увеличить количество продаж
    seller.revenue += record.total_amount; // Увеличить общую сумму выручки всех продаж

    // Расчёт прибыли для каждого товара
    record.items.forEach((item) => {
      const product = productIndex[item.sku]; // Товар

      // Посчитать себестоимость (cost) товара
      const cost = product.purchase_price * item.quantity;

      // Посчитать выручку (revenue) с учётом скидки
      const revenue = calculateRevenue(item, product);

      // Посчитать прибыль: выручка минус себестоимость
      const profit = revenue - cost;

      // Увеличить общую накопленную прибыль (profit) у продавца
      seller.profit += profit;

      // Учёт количества проданных товаров
      if (!seller.products_sold[item.sku]) {
        seller.products_sold[item.sku] = 0;
      }
      // По артикулу товара увеличить его проданное количество у продавца
      seller.products_sold[item.sku] += item.quantity;
    });
  });

  // @TODO: Сортировка продавцов по прибыли (по убыванию)
  sellerStats.sort((a, b) => b.profit - a.profit);

  // @TODO: Назначение премий на основе ранжирования
  sellerStats.forEach((seller, index) => {
    // Считаем бонус, передавая корректную длину массива как total
    seller.bonus = calculateBonus(index, sellerStats.length, seller);

    // Формируем топ-10 товаров (исправлена цепочка вызовов методов)
    seller.top_products = Object.entries(seller.products_sold)
      .map(([key, value]) => ({ sku: key, quantity: value }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  });

  // @TODO: Подготовка итоговой коллекции с нужными полями
  return sellerStats.map((seller) => ({
    seller_id: seller.id,
    name: seller.name,
    revenue: +seller.revenue.toFixed(2),
    profit: +seller.profit.toFixed(2),
    sales_count: seller.sales_count,
    top_products: seller.top_products,
    bonus: +seller.bonus.toFixed(2),
  }));
}
