import { prisma } from '../../db/prisma.js';

const slugify = (s: string) => s.trim().toLowerCase();

export async function resolveCanonicalProduct(params: {
  extractedName: string;
  manufacturer?: string;
  categoryKey?: string;
}) {
  const nameLower = slugify(params.extractedName);

  const aliasMatch = await prisma.productAlias.findFirst({
    where: { alias: nameLower },
    include: { canonicalProduct: true },
  });
  if (aliasMatch) return aliasMatch.canonicalProduct;

  const exact = await prisma.canonicalProduct.findFirst({
    where: { name: { equals: params.extractedName, mode: 'insensitive' } },
  });
  if (exact) return exact;

  const manufacturerName = params.manufacturer ?? 'Unknown Manufacturer';
  const categoryKey = params.categoryKey ?? 'other-electronics';

  const manufacturer = await prisma.manufacturer.upsert({
    where: { name: manufacturerName },
    create: { name: manufacturerName },
    update: {},
  });

  const category = await prisma.category.upsert({
    where: { key: categoryKey },
    create: { key: categoryKey, label: categoryKey.replace(/-/g, ' ') },
    update: {},
  });

  const created = await prisma.canonicalProduct.create({
    data: {
      name: params.extractedName,
      manufacturerId: manufacturer.id,
      categoryId: category.id,
      aliases: { create: { alias: nameLower } },
    },
  });

  return created;
}
