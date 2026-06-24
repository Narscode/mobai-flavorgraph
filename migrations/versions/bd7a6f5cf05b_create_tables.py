"""create_tables

Revision ID: bd7a6f5cf05b
Revises: 
Create Date: 2026-06-24 09:43:47.111761

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bd7a6f5cf05b'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'molecules',
        sa.Column('name', sa.String(), primary_key=True),
        sa.Column('cid', sa.Integer(), nullable=True),
        sa.Column('formula', sa.String(), nullable=True),
        sa.Column('weight', sa.Float(), nullable=True),
        sa.Column('smiles', sa.Text(), nullable=True),
        sa.Column('xlogp', sa.Float(), nullable=True),
        sa.Column('tpsa', sa.Float(), nullable=True),
        sa.Column('fingerprint', sa.Text(), nullable=True)
    )

    op.create_table(
        'ingredients',
        sa.Column('name', sa.String(), primary_key=True)
    )

    op.create_table(
        'ingredient_molecules',
        sa.Column('ingredient_name', sa.String(), nullable=False),
        sa.Column('molecule_name', sa.String(), nullable=False),
        sa.ForeignKeyConstraint(['ingredient_name'], ['ingredients.name'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['molecule_name'], ['molecules.name'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('ingredient_name', 'molecule_name')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('ingredient_molecules')
    op.drop_table('ingredients')
    op.drop_table('molecules')
