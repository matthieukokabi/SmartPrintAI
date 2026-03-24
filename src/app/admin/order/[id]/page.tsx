import { redirect } from 'next/navigation'

type PageProps = {
    params: {
        id: string
    }
}

export default function LegacyOwnerOrderDetailRoute({ params }: PageProps) {
    redirect(`/admin/orders/${params.id}`)
}
