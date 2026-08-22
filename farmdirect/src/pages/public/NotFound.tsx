import { Link } from "react-router-dom";
import { Container } from "../../components/ui/Card";
import EmptyState from "../../components/ui/EmptyState";
import Button from "../../components/ui/Button";

export default function NotFound() {
  return (
    <Container className="py-24">
      <EmptyState
        icon="agriculture"
        title="This field is empty"
        description="We couldn't find the page you're looking for."
        action={
          <Link to="/">
            <Button>Back to Home</Button>
          </Link>
        }
      />
    </Container>
  );
}
