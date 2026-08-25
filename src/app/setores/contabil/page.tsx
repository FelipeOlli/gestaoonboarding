import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ContabilPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contábil</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Esta aba estará disponível em uma próxima fase do projeto.
        </p>
      </CardContent>
    </Card>
  );
}
